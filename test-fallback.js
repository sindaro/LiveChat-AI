const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function suggestWithGroq(prompt) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq ${res.status}: ${err?.error?.message ?? 'Unknown error'}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty response');
  return content;
}

async function suggestWithOpenAI(prompt) {
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
    throw new Error(`OpenAI ${res.status}: ${err?.error?.message ?? 'Unknown error'}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');
  return content;
}

async function test() {
  const prompt = "Berikan saran perbaikan teks berikut: Halo";
  console.log("Testing Groq...");
  try {
    const res = await suggestWithGroq(prompt);
    console.log("Groq SUCCESS:", res.substring(0, 50));
  } catch (err) {
    console.error("Groq ERROR:", err.message);
  }

  console.log("\nTesting OpenAI...");
  try {
    const res = await suggestWithOpenAI(prompt);
    console.log("OpenAI SUCCESS:", res.substring(0, 50));
  } catch (err) {
    console.error("OpenAI ERROR:", err.message);
  }
}

test();
