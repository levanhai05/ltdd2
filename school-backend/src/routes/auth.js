import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { admin, freshAnonClient } from '../lib/supabase.js';
import { unwrap } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z } from '../lib/validate.js';
import { authenticate, PROFILE_COLS, forgetUser } from '../middleware/auth.js';

const r = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút' },
});

const pack = s => ({
  access_token: s.access_token, refresh_token: s.refresh_token,
  expires_at: s.expires_at, expires_in: s.expires_in,
});

// POST /api/auth/login  { username, password }
r.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = parse(z.object({
    username: z.string().trim().min(1).max(50),
    password: z.string().min(1).max(128),
  }), req.body);

  const email = `${username.toLowerCase()}@${config.emailDomain}`;
  const { data, error } = await freshAnonClient().auth.signInWithPassword({ email, password });
  if (error) console.error('[login]', error.status, error.message);
  if (error || !data?.session) throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');

  const profile = unwrap(await admin.from('profiles').select(PROFILE_COLS).eq('id', data.user.id).maybeSingle());
  if (!profile) throw new HttpError(403, 'Tài khoản chưa có hồ sơ');
  if (!profile.active) throw new HttpError(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ nhà trường.');
  res.json({ session: pack(data.session), profile });
});

// POST /api/auth/refresh  { refresh_token }
r.post('/refresh', loginLimiter, async (req, res) => {
  const { refresh_token } = parse(z.object({ refresh_token: z.string().min(10) }), req.body);
  const { data, error } = await freshAnonClient().auth.refreshSession({ refresh_token });
  if (error || !data?.session) throw new HttpError(401, 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
  res.json({ session: pack(data.session) });
});

// GET /api/auth/me
r.get('/me', authenticate, (req, res) => res.json(req.user));

// POST /api/auth/change-password  { old_password, new_password }
r.post('/change-password', authenticate, loginLimiter, async (req, res) => {
  const b = parse(z.object({ old_password: z.string().min(1), new_password: z.string().min(6).max(128) }), req.body);
  const email = `${req.user.username}@${config.emailDomain}`;
  const { error } = await freshAnonClient().auth.signInWithPassword({ email, password: b.old_password });
  if (error) throw new HttpError(400, 'Mật khẩu hiện tại không đúng');
  const { error: e2 } = await admin.auth.admin.updateUserById(req.user.id, { password: b.new_password });
  if (e2) throw new HttpError(400, e2.message);
  forgetUser(req.user.id);
  res.json({ ok: true });
});

export default r;
