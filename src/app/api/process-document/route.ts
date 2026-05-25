import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore
import pdfParse from 'pdf-parse';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';
export const maxDuration = 60; 

function chunkText(text: string, maxChunkSize = 800): string[] {
  // Better chunking: respect paragraphs, avoid too small or too big chunks
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const p = paragraph.trim().replace(/\s+/g, ' '); // Clean whitespace
    if (!p) continue;

    if ((currentChunk.length + p.length) < maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    } else {
      if (currentChunk.length >= 200) { // Don't push very small chunks unless necessary
        chunks.push(currentChunk);
        currentChunk = p;
      } else {
         // If current is small, just append and push, or split
         currentChunk += (currentChunk ? '\n\n' : '') + p;
         if (currentChunk.length >= maxChunkSize * 1.5) {
             chunks.push(currentChunk.slice(0, maxChunkSize));
             currentChunk = currentChunk.slice(maxChunkSize);
         } else {
             chunks.push(currentChunk);
             currentChunk = '';
         }
      }
    }
  }
  
  if (currentChunk.length > 50) { // ignore trailing tiny fragments
    chunks.push(currentChunk);
  }

  return chunks;
}

async function generateWithRotator(apiKeys: string[], executeFn: (genAI: GoogleGenerativeAI) => Promise<any>) {
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('No API keys provided by the tenant.');
  }

  let lastError = null;
  for (const key of apiKeys) {
    try {
      if (!key) continue;
      const genAI = new GoogleGenerativeAI(key);
      const result = await executeFn(genAI);
      return result; 
    } catch (error: any) {
      console.warn('API Key failed, trying next...', error?.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error('All provided API keys failed.');
}

async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured for embeddings fallback');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 768 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI Embeddings ${res.status}: ${(err as any)?.error?.message ?? 'Unknown error'}`);
  }

  const data = await res.json() as any;
  return data.data?.[0]?.embedding ?? [];
}

async function scrapeWebsite(url: string): Promise<string> {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LiveChatAI/1.0)' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Remove unwanted elements
        $('script, style, nav, footer, header, iframe, noscript').remove();
        
        let text = $('body').text();
        // Clean text
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    } catch (e: any) {
        throw new Error(`Failed to scrape website: ${e.message}`);
    }
}

export async function POST(req: NextRequest) {
  try {
    const { sourceId, businessId } = await req.json();

    if (!sourceId || !businessId) {
      return NextResponse.json({ error: 'Missing sourceId or businessId' }, { status: 400 });
    }

    // 0. Update status to processing
    await supabaseAdmin.from('KnowledgeSources').update({ status: 'processing' }).eq('id', sourceId);

    // 1. Fetch Source
    const { data: source, error: sourceError } = await supabaseAdmin
        .from('KnowledgeSources')
        .select('*')
        .eq('id', sourceId)
        .single();
    
    if (sourceError || !source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // 2. Fetch Business Profile
    const { data: businessProfile, error: profileError } = await supabaseAdmin
      .from('BusinessProfiles')
      .select('owner_id, api_keys')
      .eq('id', businessId)
      .single();

    if (profileError || !businessProfile) {
      await supabaseAdmin.from('KnowledgeSources').update({ status: 'failed', metadata: { error: 'Business profile not found' } }).eq('id', sourceId);
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    const systemApiKeys = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];
    const tenantApiKeys: string[] = Array.isArray(businessProfile.api_keys) && businessProfile.api_keys.length > 0
      ? businessProfile.api_keys
      : systemApiKeys;

    if (tenantApiKeys.length === 0) {
      await supabaseAdmin.from('KnowledgeSources').update({ status: 'failed', metadata: { error: 'No API keys' } }).eq('id', sourceId);
      return NextResponse.json({ error: 'No API Keys' }, { status: 500 });
    }

    // 3. Extract text based on source type
    let text = '';
    
    if (source.type === 'website') {
        if (!source.url) throw new Error("URL is missing for website source");
        text = await scrapeWebsite(source.url);
    } else if (source.type === 'document' || source.type === 'faq') {
        // Fetch from storage. We assume url contains the storage path like 'businessId/filename.pdf'
        if (!source.url) throw new Error("Storage path is missing");
        
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('knowledge_base')
            .download(source.url);

        if (downloadError || !fileData) {
            throw new Error('Failed to download file from storage');
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (source.url.toLowerCase().endsWith('.pdf')) {
            const result = await pdfParse(buffer);
            text = result.text;
        } else {
            // Treat as txt
            text = buffer.toString('utf-8');
        }
    } else {
        throw new Error("Unknown source type");
    }

    if (!text || !text.trim()) {
        throw new Error('Extracted text is empty');
    }

    // 4. Chunk the text
    const chunks = chunkText(text);

    // Delete existing chunks for this source if retraining
    await supabaseAdmin.from('KnowledgeDocuments').delete().eq('source_id', sourceId);

    // 5. Generate embeddings
    const embeddingPromises = chunks.map(async (chunk, i) => {
      try {
        let embedding: number[];
        try {
          embedding = await generateWithRotator(tenantApiKeys, async (genAI) => {
              const model = genAI.getGenerativeModel({ model: 'embedding-001' });
              const result = await model.embedContent(`Source: ${source.title}\n\n${chunk}`);
              return result.embedding.values;
          });
        } catch (geminiError: any) {
          const isQuota = geminiError?.status === 429
            || geminiError?.message?.includes('429')
            || geminiError?.message?.includes('quota');
          if (!isQuota) throw geminiError;
          embedding = await getOpenAIEmbedding(chunk);
        }

        return {
          source_id: sourceId,
          business_id: businessId,
          owner_id: businessProfile.owner_id,
          title: source.title,
          content: chunk,
          embedding: embedding,
          metadata: { chunk_index: i, total_chunks: chunks.length }
        };
      } catch (embedError) {
        console.error(`Failed to embed chunk ${i}:`, embedError);
        return null;
      }
    });

    const results = await Promise.all(embeddingPromises);
    const recordsToInsert = results.filter((record) => record !== null);

    // 6. Insert chunks
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('KnowledgeDocuments')
        .insert(recordsToInsert);

      if (insertError) {
        throw new Error('Failed to insert chunks: ' + insertError.message);
      }
    } else {
        throw new Error('No valid chunks were embedded');
    }

    // 7. Update status to ready
    await supabaseAdmin.from('KnowledgeSources').update({ 
        status: 'ready', 
        updated_at: new Date().toISOString()
    }).eq('id', sourceId);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${source.title} into ${recordsToInsert.length} chunks.`
    });

  } catch (error: any) {
    console.error('Processing error:', error);
    return NextResponse.json({ error: error?.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
