import 'dotenv/config';
const url = process.env.SUPABASE_URL;
for (const k of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: process.env[k] || '' } });
  console.log(k, r.status);
}