import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 768 }),
  });

  if (!res.ok) throw new Error('OpenAI Embedding failed');
  const data = await res.json() as any;
  return data.data[0].embedding;
}

export async function POST(req: NextRequest) {
    try {
        const { text, businessId } = await req.json();
        if (!text || !businessId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

        const { data: businessProfile } = await supabaseAdmin
            .from('BusinessProfiles')
            .select('api_keys')
            .eq('id', businessId)
            .single();

        const systemApiKeys = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];
        const tenantApiKeys: string[] = (businessProfile?.api_keys?.length ?? 0) > 0 ? businessProfile!.api_keys : systemApiKeys;

        if (tenantApiKeys.length === 0) return NextResponse.json({ error: 'No API keys' }, { status: 500 });

        let embedding: number[] = [];
        let success = false;
        
        for (const key of tenantApiKeys) {
            if (!key) continue;
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: 'embedding-001' });
                const result = await model.embedContent(text);
                embedding = result.embedding.values;
                success = true;
                break;
            } catch (e: any) {
                const isQuota = e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota');
                if (isQuota && process.env.OPENAI_API_KEY) {
                    embedding = await getOpenAIEmbedding(text);
                    success = true;
                    break;
                }
            }
        }

        if (!success) {
            throw new Error('All API keys failed to generate embedding');
        }

        return NextResponse.json({ embedding });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
