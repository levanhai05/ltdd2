import { supabase } from './supabase';

// Địa chỉ backend, đặt trong .env của app: EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
const BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const TIMEOUT_MS = 15000;

// Gọi school-backend kèm access_token của phiên Supabase hiện tại.
// api('/admin/users', { query: { role: 'teacher' } })
// api('/notices', { method: 'POST', body: { ... } })
export async function api(path, { method = 'GET', body, query } = {}) {
  if (!BASE) throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL trong file .env của app.');

  const { data: { session } } = await supabase.auth.getSession();

  let url = `${BASE}/api${path}`;
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? 'Máy chủ phản hồi quá lâu, vui lòng thử lại.'
      : 'Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy và EXPO_PUBLIC_API_URL đúng chưa.');
  } finally {
    clearTimeout(timer);
  }

  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(json?.error || `Lỗi ${res.status}`), { status: res.status });
  return json;
}
