const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key] = val.replace(/^"|"$/g, '').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('BusinessProfiles').select('id, name, ai_personality, chat_flow, cta_settings, handover_settings, automation_settings, branding').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
