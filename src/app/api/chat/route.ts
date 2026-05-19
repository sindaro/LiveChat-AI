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
        '{"reply": "string", "isQualified": boolean, "leadSummary": "string", "suggestions": ["string", "string"]}',
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
        '{"reply": "string", "isQualified": boolean, "leadSummary": "string", "suggestions": ["string", "string"]}',
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
      .select('name, prompt_rules, api_keys')
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

    const systemInstruction = `
You are a customer support agent and lead qualifier (a "Bouncer") for a business named "${businessProfile.name}".
Your goal is to answer user questions politely based strictly on the provided Knowledge Context.
You must also qualify leads before allowing them to proceed to contact the owner.

KNOWLEDGE CONTEXT:
${knowledgeContext ? knowledgeContext : 'No specific knowledge base provided.'}

QUALIFICATION RULES:
${businessProfile.prompt_rules ? businessProfile.prompt_rules : 'Determine if the user has a serious intent to purchase. Ask relevant qualifying questions if their intent is unclear.'}

INSTRUCTIONS:
1. Answer the user's questions accurately using ONLY the Knowledge Context. If the answer is not in the context, politely state that you do not know.
2. Follow the QUALIFICATION RULES strictly. Do not mark the user as qualified until they have explicitly met all the conditions stated in the rules.
3. If they are not yet qualified, keep the conversation going and ask the necessary questions to satisfy the rules.
4. If they have met ALL the qualification rules, acknowledge it positively and explicitly state that they can now proceed to contact the owner via the button provided.
5. IF the user is qualified, you MUST provide a "leadSummary" summarizing their profile, requests, and answers to the qualification questions. If not qualified, leave it empty.

FORMATTING RULES (very important):
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
                reply: { type: SchemaType.STRING, description: "The conversational response to the user's message." },
                isQualified: { type: SchemaType.BOOLEAN, description: 'True ONLY if qualification rules are fully met.' },
                leadSummary: { type: SchemaType.STRING, description: 'Summary only when isQualified is true, else empty.' },
                suggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: '2 follow-up questions.' },
              },
              required: ['reply', 'isQualified', 'leadSummary'],
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

    if (conversationId) {
      const updatedLogs = [...messages, { role: 'model', content: structuredResponse.reply }];
      
      const { error: updateError } = await supabase
        .from('Conversations')
        .update({
          logs: updatedLogs,
          is_qualified: structuredResponse.isQualified,
          lead_summary: structuredResponse.leadSummary || null,
        })
        .eq('id', conversationId);

      if (updateError) {
         console.error('Failed to update conversation logs:', updateError);
      }
    }

    return NextResponse.json(structuredResponse);

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
