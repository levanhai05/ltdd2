import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

// Client quyền cao (service_role): BỎ QUA RLS => mọi route phải tự kiểm tra quyền.
export const admin = createClient(config.supabase.url, config.supabase.serviceKey, opts);

// Client mới cho mỗi lần đăng nhập, tránh dùng chung session giữa các người dùng.
export const freshAnonClient = () => createClient(config.supabase.url, config.supabase.anonKey, opts);
