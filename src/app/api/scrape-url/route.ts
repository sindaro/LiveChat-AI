import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function generateWithRotator(apiKeys: string[], executeFn: (genAI: GoogleGenerativeAI) => Promise<any>) {
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('No API keys provided.');
  }
  let lastError = null;
  for (const key of apiKeys) {
    try {
      if (!key) continue;
      const genAI = new GoogleGenerativeAI(key);
      return await executeFn(genAI);
    } catch (error: any) {
      console.warn('API Key failed, trying next...', error?.message || error);
      lastError = error;
    }
  }
  throw lastError || new Error('All API keys failed.');
}

// Groq fallback — free tier
async function scrapeWithGroq(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq ${res.status}: ${(err as any)?.error?.message ?? 'Unknown error'}`);
  }

  const data = await res.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty response');
  return content;
}

// OpenAI fallback
async function scrapeWithOpenAI(prompt: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI ${res.status}: ${(err as any)?.error?.message ?? 'Unknown error'}`);
  }

  const data = await res.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');
  return content;
}

function cleanHtml(html: string): string {
  // Simple tag stripping and whitespace cleanup
  return html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { url, businessId } = await req.json();

    if (!url || !businessId) {
      return NextResponse.json({ error: 'URL and businessId are required' }, { status: 400 });
    }

    // 1. Fetch Business Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('BusinessProfiles')
      .select('api_keys, owner_id, name')
      .eq('id', businessId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    const systemApiKeys = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];
    const apiKeys: string[] = Array.isArray(profile.api_keys) && profile.api_keys.length > 0
      ? profile.api_keys
      : systemApiKeys;

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'AI API Key not configured.' }, { status: 400 });
    }

    // 2. Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const rawText = cleanHtml(html);

    if (rawText.length < 100) {
      throw new Error('Insufficient content extracted from URL.');
    }

    // 3. Use AI to clean and structure the content
    const prompt = `
Extract and clean the following raw text from a website into a structured Knowledge Base content in Markdown format.
The goal is to provide useful information for a chatbot representing the business "${profile.name}".

RAW TEXT:
${rawText.substring(0, 10000)}

INSTRUCTIONS:
- Format the output in Markdown.
- Focus on products, services, pricing, contact info, and FAQs.
- Remove navigation menus, footers, and irrelevant legal boilerplate.
- Use Bahasa Indonesia if the content is in Indonesian, otherwise use English.
- Be concise but comprehensive.

OUTPUT:
`;

    let cleanedContent = '';
    try {
      cleanedContent = await generateWithRotator(apiKeys, async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
      });
    } catch (geminiError: any) {
      const isQuota = geminiError?.status === 429
        || geminiError?.message?.includes('429')
        || geminiError?.message?.includes('quota');

      if (!isQuota) throw geminiError;

      // --- Fallback 1: Groq ---
      try {
        console.warn('Gemini quota exhausted — trying Groq fallback for scraping...');
        cleanedContent = await scrapeWithGroq(prompt);
      } catch (groqError: any) {
        // --- Fallback 2: OpenAI ---
        console.warn('Groq failed — trying OpenAI fallback for scraping...', groqError?.message);
        cleanedContent = await scrapeWithOpenAI(prompt);
      }
    }

    // 4. Save to Storage as .txt file
    const fileName = `${Math.random().toString(36).substring(2, 15)}_scraped_${new URL(url).hostname}.txt`;
    const filePath = `${businessId}/${fileName}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('knowledge_base')
      .upload(filePath, cleanedContent, { contentType: 'text/plain' });

    if (uploadError) throw uploadError;

    // 5. Trigger the process-document API internally or via fetch
    // For simplicity, we return the content and let the frontend call process-document
    // or we can call it here. Let's call it here for better UX.

    return NextResponse.json({ 
      success: true, 
      fileName: filePath,
      content: cleanedContent 
    });

  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to scrape URL' }, { status: 500 });
  }
}
