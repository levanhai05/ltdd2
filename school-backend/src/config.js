import 'dotenv/config';

const need = k => {
  const v = process.env[k];
  if (!v) throw new Error(`Thiếu biến môi trường ${k} (xem .env.example)`);
  return v;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  tz: process.env.SCHOOL_TZ || 'Asia/Ho_Chi_Minh',
  emailDomain: process.env.EMAIL_DOMAIN || 'school.local',
  semester: Number(process.env.CURRENT_SEMESTER || 1),
  supabase: {
    url: need('SUPABASE_URL'),
    anonKey: need('SUPABASE_ANON_KEY'),
    serviceKey: need('SUPABASE_SERVICE_ROLE_KEY'),
  },
};
