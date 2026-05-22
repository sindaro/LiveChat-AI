import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

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

// Groq fallback — free tier, no billing required
// Kicks in automatically when all Gemini keys are quota-exhausted (429)
async function generateWithGroq(
  systemInstruction: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  lastUserMessage: string
): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');

  const messages = [
    {
      role: 'system',
      content: systemInstruction +
        '\n\nRespond ONLY with a valid JSON object. Required fields:\n' +
        '{"reply": "string", "customerName": "string or null", "customerPhone": "string or null", "customerIntent": "string", "leadStatus": "cold|warm|hot", "aiNote": "string", "suggestions": ["string", "string"]}',
    },
    ...history.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts?.[0]?.text ?? '',
    })),
    { role: 'user', content: lastUserMessage },
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 1024,
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
  return JSON.parse(content);
}

// OpenAI fallback — second-level fallback if Groq also fails
async function generateWithOpenAI(
  systemInstruction: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  lastUserMessage: string
): Promise<any> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const messages = [
    {
      role: 'system',
      content: systemInstruction +
        '\n\nRespond ONLY with a valid JSON object. Required fields:\n' +
        '{"reply": "string", "customerName": "string or null", "customerPhone": "string or null", "customerIntent": "string", "leadStatus": "cold|warm|hot", "aiNote": "string", "suggestions": ["string", "string"]}',
    },
    ...history.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts?.[0]?.text ?? '',
    })),
    { role: 'user', content: lastUserMessage },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 1024,
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
  return JSON.parse(content);
}

// OpenAI embeddings — used when Gemini embedding models are unavailable
async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    
    if (ip !== 'unknown') {
      const windowStart = now - RATE_LIMIT_WINDOW;
      const requestData = rateLimitMap.get(ip) || { count: 0, timestamp: now };
      
      if (requestData.timestamp < windowStart) {
        requestData.count = 0;
        requestData.timestamp = now;
      }
      
      requestData.count++;
      rateLimitMap.set(ip, requestData);
      
      if (requestData.count > MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json(
          { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
          { status: 429 }
        );
      }
    }

    const { messages, businessId, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1].content;

    const { data: businessProfile, error: profileError } = await supabase
      .from('BusinessProfiles')
      .select('*')
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

    let knowledgeContext = '';
    try {
      // Try Gemini embeddings first, fall back to OpenAI text-embedding-3-small
      let queryEmbedding: number[];
      try {
        queryEmbedding = await generateWithRotator(tenantApiKeys, async (genAI) => {
          const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
          const embeddingResult = await embeddingModel.embedContent(lastUserMessage);
          return embeddingResult.embedding.values;
        });
      } catch {
        // Gemini embedding failed — use OpenAI embeddings instead
        queryEmbedding = await getOpenAIEmbedding(lastUserMessage);
      }

      const { data: documents, error: searchError } = await supabase.rpc('match_knowledge_documents', {
        query_embedding: queryEmbedding,
        match_count: 5,
        filter_business_id: businessId,
      });
      if (searchError) console.error('Vector search error:', searchError);
      if (documents && documents.length > 0) {
        knowledgeContext = documents.map((doc: any) => doc.content).join('\n\n');
      }
    } catch (embeddingError: any) {
      console.warn('RAG pipeline failed, proceeding without knowledge context:', embeddingError?.message);
    }

    const aiPersonality = businessProfile.ai_personality || { mode: 'professional', formality: 3, emoji_level: 2 };
    
    // Map personality settings to prompt instructions
    const formalityGuidance = aiPersonality.formality >= 4 ? "Gunakan bahasa formal dan sangat sopan." :
                              aiPersonality.formality <= 2 ? "Gunakan bahasa santai, akrab, layaknya teman." :
                              "Gunakan bahasa semi-formal yang sopan namun tidak kaku.";
                              
    const emojiGuidance = aiPersonality.emoji_level >= 4 ? "Sering gunakan emoji yang relevan untuk mencairkan suasana." :
                          aiPersonality.emoji_level <= 2 ? "Gunakan emoji sesedikit mungkin, fokus pada profesionalitas." :
                          "Gunakan 1-2 emoji secukupnya untuk menjaga keramahan.";

    const modeGuidance = aiPersonality.mode === 'friendly' ? "Kamu sangat ramah, hangat, dan empatik." :
                         aiPersonality.mode === 'fast-selling' ? "Kamu to-the-point, fokus pada jualan (conversion), dan selalu berusaha mengarahkan ke transaksi." :
                         "Kamu adalah representasi profesional dari brand.";

    const systemInstruction = `
You are an AI Customer Service agent named "${businessProfile.assistant_name || 'Asisten AI'}" working for a business named "${businessProfile.name}".
Your goal is to answer user questions politely based strictly on the provided Knowledge Context.
You must also qualify leads before allowing them to proceed to contact the owner.

PERSONALITY & TONE:
- Character Mode: ${modeGuidance}
- Formality: ${formalityGuidance}
- Emoji Usage: ${emojiGuidance}

KNOWLEDGE CONTEXT:
${knowledgeContext ? knowledgeContext : 'No specific knowledge base provided.'}

QUALIFICATION RULES:
${businessProfile.prompt_rules ? businessProfile.prompt_rules : 'Determine if the user has a serious intent to purchase. Ask relevant qualifying questions if their intent is unclear.'}

INSTRUCTIONS FOR SOFT CTA FLOW:
1. HELP FIRST: Answer the user's questions accurately using ONLY the Knowledge Context. Bangun trust dan bantu kebutuhan mereka terlebih dahulu. JANGAN TERDENGAR SEPERTI FORM BOT.
2. NATURAL QUALIFICATION: Gali kebutuhan dan minat user. Update "customerIntent" berdasarkan obrolan sejauh ini.
3. SOFT ASK NAME: Setelah user merasa terbantu, secara natural pancing untuk meminta nama mereka ("Oh ya, dengan kakak siapa ini?").
4. SOFT ASK WHATSAPP: Jika mereka sudah cukup yakin (warm/hot) dan butuh eskalasi/detail lebih lanjut, secara halus tanyakan WhatsApp mereka sebelum transfer ke admin.
5. LEAD STATUS EVALUATION:
   - "cold": User hanya eksplorasi, belum ada tanda ketertarikan jelas.
   - "warm": User mulai tertarik, bertanya harga, atau menanyakan detail spesifik.
   - "hot": User sudah siap dihubungkan ke admin, sudah memberikan nama & kontak.
6. HANYA setelah mereka siap (status hot), persilakan mereka untuk klik tombol penghubung ke admin/CS. JANGAN arahkan ke CS jika mereka masih di fase eksplorasi awal.
7. Selalu isi field "aiNote" dengan rangkuman kondisi pelanggan (misal: "Tertarik solusi A, belum yakin soal harga").

FORMATTING RULES (very important):
- Jawablah dengan singkat, padat, idealnya 1-4 baris per paragraf. Hindari jawaban panjang yang membosankan.
- Use **bold** for key terms, product names, or important information.
- Use bullet lists (- item) when listing multiple features, benefits, or options.
- Use numbered lists (1. item) when describing steps or ordered processes.
- Use > blockquote for important notes or warnings.
- Use ## headings to introduce new sections when the response is long.
- Keep responses concise and easy to read on mobile.

PRODUCT CARD FORMAT (use ONLY when recommending or showcasing a specific product/service):
When you want to show a product or service with pricing, use this exact format AFTER your text response:

[PRODUCT_CARD]
name: Product Name Here
price: Rp 150.000 / unit
description: Short one-sentence description of the product.
badge: TERLARIS
[/PRODUCT_CARD]

You can include multiple [PRODUCT_CARD] blocks. Only use them when explicitly discussing a specific product with price.
`;


    // Build history (shared between Gemini and Groq paths)
    const rawHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    const firstUserIdx = rawHistory.findIndex((m: any) => m.role === 'user');
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

    // --- Primary: Gemini ---
    let structuredResponse: any;
    try {
      structuredResponse = await generateWithRotator(tenantApiKeys, async (genAI) => {
        const chatModel = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                reply: { type: SchemaType.STRING, description: 'Balasan pesan untuk user' },
                customerName: { type: SchemaType.STRING, description: 'Nama user jika sudah diketahui, jika belum maka null' },
                customerPhone: { type: SchemaType.STRING, description: 'Nomor WA user jika sudah diketahui, jika belum maka null' },
                customerIntent: { type: SchemaType.STRING, description: 'Niat atau topik utama yang dicari user' },
                leadStatus: { type: SchemaType.STRING, description: 'Status lead: cold, warm, atau hot' },
                aiNote: { type: SchemaType.STRING, description: 'Rangkuman internal AI tentang kondisi dan kebutuhan user (readable by admin)' },
                suggestions: {
                  type: SchemaType.ARRAY,
                  description: '2-3 tombol quick reply relevan untuk balasan berikutnya',
                  items: { type: SchemaType.STRING }
                }
              },
              required: ['reply', 'leadStatus', 'suggestions']
            },
          },
        });

        const chatSession = chatModel.startChat({ history });
        const result = await chatSession.sendMessage([{ text: lastUserMessage }]);
        return JSON.parse(result.response.text());
      });
    } catch (geminiError: any) {
      const isQuota = geminiError?.status === 429
        || geminiError?.message?.includes('429')
        || geminiError?.message?.includes('quota');

      if (!isQuota) throw geminiError;

      // --- Fallback 1: Groq ---
      try {
        console.warn('Gemini quota exhausted — trying Groq fallback...');
        structuredResponse = await generateWithGroq(systemInstruction, history, lastUserMessage);
      } catch (groqError: any) {
        // --- Fallback 2: OpenAI ---
        console.warn('Groq failed — trying OpenAI fallback...', groqError?.message);
        structuredResponse = await generateWithOpenAI(systemInstruction, history, lastUserMessage);
      }
    }

    const newLogs = [...messages, { role: 'model', content: structuredResponse.reply }];
      
    // Construct human-readable lead summary
    const constructedSummary = `
**Nama**: ${structuredResponse.customerName || '-'}
**No. WA**: ${structuredResponse.customerPhone || '-'}
**Intent**: ${structuredResponse.customerIntent || '-'}
**Status**: ${structuredResponse.leadStatus === 'hot' ? '🔥 Hot' : structuredResponse.leadStatus === 'warm' ? 'Warm' : 'Cold'} Lead
**Catatan AI**: ${structuredResponse.aiNote || '-'}
    `.trim();

    const isQualifiedFinal = structuredResponse.leadStatus === 'hot';

    if (conversationId) {
      await supabase.from('Conversations').update({
        logs: newLogs,
        is_qualified: isQualifiedFinal,
        lead_summary: constructedSummary,
        customer_name: structuredResponse.customerName || null,
        customer_phone: structuredResponse.customerPhone || null,
        updated_at: new Date().toISOString()
      }).eq('id', conversationId);

      if (isQualifiedFinal) {
        // Upsert to Leads
        await supabase.from('Leads').upsert({
          business_id: businessId,
          name: structuredResponse.customerName || 'Anonymous',
          phone: structuredResponse.customerPhone || '',
          email: '',
          status: 'Baru',
          lead_summary: constructedSummary,
        });
      }
    }

    return NextResponse.json({
      reply: structuredResponse.reply,
      isQualified: isQualifiedFinal,
      leadStatus: structuredResponse.leadStatus,
      leadSummary: constructedSummary,
      suggestions: structuredResponse.suggestions
    });

  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    // Give a friendly message for quota exhaustion
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      return NextResponse.json({ 
        error: 'Sistem AI sedang sibuk. Silakan coba beberapa saat lagi.' 
      }, { status: 429 });
    }
    return NextResponse.json({ error: error?.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
