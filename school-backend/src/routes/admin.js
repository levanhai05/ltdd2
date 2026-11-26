import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { config } from '../config.js';
import { admin } from '../lib/supabase.js';
import { unwrap, fetchAll } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, uuid, id } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';
import { todayYMD } from '../lib/dates.js';
import { authenticate, requireRole, forgetUser } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('admin'));

const PREFIX = { parent: 'ph', teacher: 'gv', guard: 'bv' };
const LOCK = '876000h'; // ~100 năm

// Mật khẩu tạm 10 ký tự, bỏ ký tự dễ nhầm (0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const tempPassword = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

async function getTarget(uid) {
  const t = unwrap(await admin.from('profiles').select('id, username, role, active').eq('id', uid).maybeSingle());
  if (!t) throw new HttpError(404, 'Không tìm thấy tài khoản');
  if (t.role === 'admin') throw new HttpError(403, 'Không thể thao tác trên tài khoản quản trị');
  return t;
}

// ---------- Tài khoản ----------

// GET /api/admin/users?role=&q=&limit=&offset=&sort=username|recent
r.get('/users', async (req, res) => {
  const q = parse(z.object({
    role: z.enum(['parent', 'teacher', 'guard']).optional(),
    q: z.string().trim().max(50).optional(),
    limit: z.coerce.number().int().min(1).max(300).default(100),
    offset: z.coerce.number().int().min(0).default(0),
    sort: z.enum(['username', 'recent']).default('username'),
  }), req.query);
  let b = admin.from('profiles').select('id, username, full_name, role, phone, active, created_at', { count: 'exact' })
    .neq('role', 'admin')
    .order(...(q.sort === 'recent' ? ['created_at', { ascending: false }] : ['username']))
    .range(q.offset, q.offset + q.limit - 1);
  if (q.role) b = b.eq('role', q.role);
  if (q.q) {
    const s = q.q.replace(/[%,()]/g, ' ');
    b = b.or(`username.ilike.%${s}%,full_name.ilike.%${s}%`);
  }
  const { data, error, count } = await b;
  if (error) throw new HttpError(500, error.message);
  res.json({ items: data, total: count });
});

// POST /api/admin/users  { role, full_name, phone?, student_code? }
// Server sinh tên đăng nhập + mật khẩu tạm và trả về 1 lần duy nhất.
r.post('/users', async (req, res) => {
  const b = parse(z.object({
    role: z.enum(['parent', 'teacher', 'guard']),
    full_name: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(20).nullish(),
    student_code: z.string().trim().max(20).nullish(),
  }), req.body);

  let student = null;
  if (b.role === 'parent' && b.student_code) {
    student = unwrap(await admin.from('students').select('id, account_id').eq('code', b.student_code.toUpperCase()).maybeSingle());
    if (!student) throw new HttpError(404, `Không có học sinh mã ${b.student_code}`);
    if (student.account_id) throw new HttpError(409, 'Học sinh này đã được gắn với một tài khoản khác');
  }

  const prefix = PREFIX[b.role];
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('username', `${prefix}%`);
  const password = tempPassword();

  let user = null, username = null;
  for (let i = 1; i <= 30 && !user; i++) {           // thử số kế tiếp nếu trùng tên
    username = `${prefix}${String((count || 0) + i).padStart(3, '0')}`;
    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@${config.emailDomain}`, password, email_confirm: true,
    });
    if (!error) user = data.user;
    else if (!/already|exists|registered/i.test(error.message)) throw new HttpError(500, error.message);
  }
  if (!user) throw new HttpError(500, 'Không sinh được tên đăng nhập, hãy thử lại');

  try {
    unwrap(await admin.from('profiles').insert({
      id: user.id, username, full_name: b.full_name, role: b.role, phone: b.phone || null,
    }));
    if (student) {
      const rows = unwrap(await admin.from('students').update({ account_id: user.id })
        .eq('id', student.id).is('account_id', null).select('id'));
      if (!rows.length) throw new HttpError(409, 'Học sinh này vừa được gắn với tài khoản khác');
    }
  } catch (e) {
    await admin.auth.admin.deleteUser(user.id);       // hoàn tác, không để lại tài khoản dở dang
    throw e;
  }

  await logActivity('account', `Cấp tài khoản ${username} (${b.role})`, req.user.id);
  res.status(201).json({ id: user.id, username, password, role: b.role, full_name: b.full_name });
});

// PATCH /api/admin/users/:id/active  { active }
r.patch('/users/:id/active', async (req, res) => {
  const uid = parse(z.object({ id: uuid }), req.params).id;
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  const t = await getTarget(uid);
  unwrap(await admin.from('profiles').update({ active }).eq('id', uid));
  const { error } = await admin.auth.admin.updateUserById(uid, { ban_duration: active ? 'none' : LOCK });
  if (error) throw new HttpError(500, error.message);
  forgetUser(uid);
  await logActivity('account', `${active ? 'Mở khóa' : 'Khóa'} tài khoản ${t.username}`, req.user.id);
  res.json({ id: uid, active });
});

// POST /api/admin/users/:id/reset-password
r.post('/users/:id/reset-password', async (req, res) => {
  const uid = parse(z.object({ id: uuid }), req.params).id;
  const t = await getTarget(uid);
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(uid, { password });
  if (error) throw new HttpError(500, error.message);
  forgetUser(uid);
  await logActivity('account', `Cấp lại mật khẩu cho ${t.username}`, req.user.id);
  res.json({ id: uid, username: t.username, password });
});

// ---------- Thống kê ----------

// GET /api/admin/summary  -> số tài khoản theo vai trò (không tính admin)
r.get('/summary', async (req, res) => {
  const roles = ['parent', 'teacher', 'guard'];
  const counts = await Promise.all(roles.flatMap(role => [true, false].map(async active => {
    const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', role).eq('active', active);
    if (error) throw new HttpError(500, error.message);
    return { acc_role: role, acc_active: active, acc_total: count || 0 };
  })));
  const byRole = {};
  let total = 0, locked = 0;
  counts.forEach(c => {
    byRole[c.acc_role] = (byRole[c.acc_role] || 0) + c.acc_total;
    total += c.acc_total;
    if (!c.acc_active) locked += c.acc_total;
  });
  res.json({ rows: counts, byRole, total, locked, active: total - locked });
});

// GET /api/admin/stats/attendance?day=YYYY-MM-DD  -> điểm danh theo lớp
r.get('/stats/attendance', async (req, res) => {
  const day = parse(z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayYMD()) }), req.query).day;
  const [classes, students, att] = await Promise.all([
    admin.from('classes').select('id, name').order('name'),
    fetchAll(() => admin.from('students').select('id, class_id').order('id')),
    fetchAll(() => admin.from('attendance').select('student_id, status').eq('day', day).order('student_id')),
  ]);
  const status = new Map(att.map(a => [a.student_id, a.status]));
  const per = new Map(unwrap(classes).map(c => [c.id, { class_id: c.id, name: c.name, total: 0, present: 0, late: 0, absent: 0, unmarked: 0 }]));
  students.forEach(s => {
    const c = per.get(s.class_id); if (!c) return;
    c.total++;
    const st = status.get(s.id);
    c[st || 'unmarked']++;
  });
  res.json({ day, classes: [...per.values()] });
});

// GET /api/admin/logs?kind=&limit=&before=<id>
r.get('/logs', async (req, res) => {
  const q = parse(z.object({
    kind: z.enum(['account', 'device', 'system']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    before: z.coerce.number().int().positive().optional(),
  }), req.query);
  let b = admin.from('activity_logs').select('id, kind, text, created_at, actor:profiles(username, full_name)')
    .order('id', { ascending: false }).limit(q.limit);
  if (q.kind) b = b.eq('kind', q.kind);
  if (q.before) b = b.lt('id', q.before);
  res.json(unwrap(await b));
});

// ---------- Danh bạ khẩn cấp ----------

// PATCH /api/admin/emergency-contacts/:id  { name?, phone? }
r.patch('/emergency-contacts/:id', async (req, res) => {
  const cid = parse(z.object({ id }), req.params).id;
  const b = parse(z.object({
    name: z.string().trim().min(1).max(60).optional(),
    phone: z.string().trim().regex(/^\+?\d{3,15}$/, 'Số điện thoại không hợp lệ').optional(),
  }).refine(v => v.name || v.phone, 'Cần name hoặc phone'), req.body);
  const rows = unwrap(await admin.from('emergency_contacts').update(b).eq('id', cid).select());
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy liên hệ');
  res.json(rows[0]);
});

export default r;
