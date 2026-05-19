import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore - pdf-parse types don't match ESM default export
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 60; 

function chunkText(text: string, maxChunkSize = 1000): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const p = paragraph.trim();
    if (!p) continue;

    if ((currentChunk.length + p.length) < maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      
      if (p.length >= maxChunkSize) {
        const sentences = p.split(/(?<=\.)\s+/);
        let tempChunk = '';
        for (const sentence of sentences) {
          if ((tempChunk.length + sentence.length) < maxChunkSize) {
            tempChunk += (tempChunk ? ' ' : '') + sentence;
          } else {
            if (tempChunk) chunks.push(tempChunk);
            tempChunk = sentence;
          }
        }
        if (tempChunk) currentChunk = tempChunk;
      } else {
        currentChunk = p;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Helper to execute generation with Rotator
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
      return result; // Success, return early
    } catch (error: any) {
      console.warn('API Key failed, trying next...', error?.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error('All provided API keys failed.');
}

// OpenAI embeddings fallback
async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured for embeddings fallback');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI Embeddings ${res.status}: ${(err as any)?.error?.message ?? 'Unknown error'}`);
  }

  const data = await res.json() as any;
  return data.data?.[0]?.embedding ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, businessId } = await req.json();

    if (!fileName || !businessId) {
      return NextResponse.json({ error: 'Missing fileName or businessId' }, { status: 400 });
    }

    // 1. Fetch Business Profile to get owner_id and api_keys
    const { data: businessProfile, error: profileError } = await supabaseAdmin
      .from('BusinessProfiles')
      .select('owner_id, api_keys')
      .eq('id', businessId)
      .single();

    if (profileError || !businessProfile) {
      console.error('Failed to fetch business profile:', profileError);
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    const systemApiKeys = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];
    const tenantApiKeys: string[] = Array.isArray(businessProfile.api_keys) && businessProfile.api_keys.length > 0
      ? businessProfile.api_keys
      : systemApiKeys;

    if (tenantApiKeys.length === 0) {
      return NextResponse.json({ error: 'Business owner has not configured AI API Keys and no system fallback available.' }, { status: 500 });
    }

    // 2. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('knowledge_base')
      .download(fileName);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 });
    }

    // 3. Extract text based on file type
    let text = '';
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (fileName.toLowerCase().endsWith('.pdf')) {
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (fileName.toLowerCase().endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Only PDF and TXT are supported.' }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Extracted text is empty' }, { status: 400 });
    }

    // 4. Chunk the text
    const chunks = chunkText(text);

    // 5. Generate embeddings and store in database using Rotator
    const recordsToInsert = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        let embedding: number[];
        try {
          embedding = await generateWithRotator(tenantApiKeys, async (genAI) => {
              const model = genAI.getGenerativeModel({ model: 'embedding-001' });
              const result = await model.embedContent(chunk);
              return result.embedding.values;
          });
        } catch (geminiError: any) {
          const isQuota = geminiError?.status === 429
            || geminiError?.message?.includes('429')
            || geminiError?.message?.includes('quota');
          
          if (!isQuota) throw geminiError;
          
          console.warn('Gemini embedding quota exhausted — trying OpenAI fallback...');
          embedding = await getOpenAIEmbedding(chunk);
        }

        recordsToInsert.push({
          business_id: businessId,
          owner_id: businessProfile.owner_id, // Add owner_id to fulfill RLS/schema
          title: fileName,
          content: chunk,
          embedding: embedding,
          metadata: { chunk_index: i, total_chunks: chunks.length }
        });
      } catch (embedError) {
        console.error(`Failed to embed chunk ${i}:`, embedError);
      }
    }

    // 6. Insert into Supabase KnowledgeDocuments table using Admin client
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('KnowledgeDocuments')
        .insert(recordsToInsert);

      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to insert embeddings into database' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${fileName} into ${recordsToInsert.length} chunks.`
    });

  } catch (error: any) {
    console.error('Processing error:', error);
    return NextResponse.json({ error: error?.message || 'An unexpected error occurred during processing' }, { status: 500 });
  }
}
