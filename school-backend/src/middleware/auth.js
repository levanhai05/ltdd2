import { admin } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';

export const PROFILE_COLS = 'id, username, full_name, role, phone, active';

// Cache ngắn để mỗi request không phải gọi Supabase 2 lần. Khóa tài khoản có hiệu lực tối đa sau TTL.
const TTL = 10_000;
const cache = new Map();

export async function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Chưa đăng nhập');

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) { req.user = hit.profile; return next(); }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');

  const { data: profile } = await admin.from('profiles').select(PROFILE_COLS).eq('id', data.user.id).maybeSingle();
  if (!profile) throw new HttpError(403, 'Tài khoản chưa có hồ sơ');
  if (!profile.active) throw new HttpError(403, 'Tài khoản đã bị khóa');

  if (cache.size > 2000) cache.clear();
  cache.set(token, { profile, exp: Date.now() + TTL });
  req.user = profile;
  next();
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này'));

// Xóa cache của 1 người dùng (gọi sau khi khóa tài khoản / đổi mật khẩu)
export function forgetUser(uid) {
  for (const [k, v] of cache) if (v.profile.id === uid) cache.delete(k);
}
