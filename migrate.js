const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key] = val.replace(/^"|"$/g, '').trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error: e1 } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE "Conversations" ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'cold';
      ALTER TABLE "Conversations" ADD COLUMN IF NOT EXISTS customer_intent TEXT;
      ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'cold';
      ALTER TABLE "Leads" ADD COLUMN IF NOT EXISTS customer_intent TEXT;
    `
  });
  console.log('e1:', e1);
}
run();
