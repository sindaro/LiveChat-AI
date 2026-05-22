import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Reuse the key rotator pattern
async function generateWithRotator(apiKeys: string[], executeFn: (genAI: GoogleGenerativeAI) => Promise<any>) {
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('No API keys provided by the tenant.');
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
  throw lastError || new Error('All provided API keys failed.');
}

// Groq fallback — free tier
async function suggestWithGroq(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
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
async function suggestWithOpenAI(prompt: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
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

export async function POST(req: NextRequest) {
  try {
    const { title, content, businessId, action } = await req.json();

    if (!businessId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch API keys from business profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('BusinessProfiles')
      .select('api_keys, name')
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
      return NextResponse.json({ error: 'API Key belum dikonfigurasi dan fallback tidak tersedia.' }, { status: 400 });
    }

    let prompt = '';

    // Limit content length to prevent token exhaustion on fallbacks (max ~10k chars)
    const safeContent = content ? content.substring(0, 10000) : '';

    if (action === 'generate') {
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Judul diperlukan untuk generate konten' }, { status: 400 });
      }
      prompt = `Kamu adalah asisten admin bisnis "${profile.name}". 

Berdasarkan judul dokumen knowledge base berikut: "${title}"

Buatkan outline konten yang lengkap dan komprehensif dalam format Markdown. Konten ini akan digunakan untuk melatih chatbot AI agar bisa menjawab pertanyaan pelanggan.

Panduan:
- Gunakan heading (##), bullet points, dan format yang rapi
- Sertakan informasi yang biasanya dibutuhkan pelanggan
- Sertakan contoh data/harga jika relevan (bisa diisi nanti oleh admin)
- Gunakan bahasa Indonesia yang natural dan informatif
- Tulis minimal 300-500 kata
- Pastikan mencakup FAQ yang mungkin ditanyakan pelanggan

Berikan HANYA konten markdown saja, tanpa penjelasan tambahan.`;
    } else if (action === 'audit') {
      if (!safeContent?.trim()) {
        return NextResponse.json({ error: 'Konten diperlukan untuk audit' }, { status: 400 });
      }
      prompt = `Kamu adalah AI Content Auditor untuk bisnis "${profile.name}".

Analisis konten knowledge base berikut dan berikan rekomendasi perbaikan:

---
${title ? `Judul: ${title}\n` : ''}
${safeContent}
---

Tugas:
1. Identifikasi informasi yang KURANG atau BELUM ADA tapi penting untuk pelanggan
2. Berikan rekomendasi spesifik apa yang harus ditambahkan
3. Periksa kelengkapan (apakah ada kebijakan retur, garansi, jam operasional, kontak, dll yang belum disebutkan)
4. Sarankan perbaikan struktur atau kejelasan informasi

Format respons:
## 🔍 Hasil Audit Konten

### ✅ Yang Sudah Baik
- (list hal positif)

### ⚠️ Informasi yang Perlu Ditambahkan
- (list rekomendasi spesifik, masing-masing dengan alasan singkat)

### 💡 Saran Perbaikan
- (saran untuk memperbaiki struktur/kejelasan)

Gunakan bahasa Indonesia. Berikan insight yang actionable.`;
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "generate" or "audit".' }, { status: 400 });
    }

    // Call Gemini with Fallbacks
    let suggestion = '';
    try {
      suggestion = await generateWithRotator(apiKeys, async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
      });
    } catch (geminiError: any) {
      const isQuota = geminiError?.status === 429
        || geminiError?.message?.includes('429')
        || geminiError?.message?.includes('quota')
        || geminiError?.message?.includes('Quota');

      if (!isQuota) throw geminiError;

      // --- Fallback 1: Groq ---
      try {
        console.warn('Gemini quota exhausted — trying Groq fallback for ai-suggest...');
        suggestion = await suggestWithGroq(prompt);
      } catch (groqError: any) {
        // --- Fallback 2: OpenAI ---
        try {
          console.warn('Groq failed — trying OpenAI fallback for ai-suggest...', groqError?.message);
          suggestion = await suggestWithOpenAI(prompt);
        } catch (openAiError: any) {
          console.error('OpenAI fallback failed:', openAiError?.message);
          throw new Error('Semua AI provider (Gemini, Groq, OpenAI) sedang limit atau sibuk. Silakan coba beberapa menit lagi.');
        }
      }
    }

    return NextResponse.json({ suggestion });

  } catch (error: any) {
    console.error('AI suggest error:', error);
    return NextResponse.json({ error: error?.message || 'AI request failed' }, { status: 500 });
  }
}
