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
      if (!content?.trim()) {
        return NextResponse.json({ error: 'Konten diperlukan untuk audit' }, { status: 400 });
      }
      prompt = `Kamu adalah AI Content Auditor untuk bisnis "${profile.name}".

Analisis konten knowledge base berikut dan berikan rekomendasi perbaikan:

---
${title ? `Judul: ${title}\n` : ''}
${content}
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

    // Call Gemini
    const suggestion = await generateWithRotator(apiKeys, async (genAI) => {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    return NextResponse.json({ suggestion });

  } catch (error: any) {
    console.error('AI suggest error:', error);
    return NextResponse.json({ error: error?.message || 'AI request failed' }, { status: 500 });
  }
}
