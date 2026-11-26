import { Router } from 'express';
import { admin } from '../lib/supabase.js';
import { unwrap } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, id } from '../lib/validate.js';
import { getStudentOf, assertTeacherOfClass } from '../lib/school.js';
import { logActivity } from '../lib/activity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate);

// Mỗi vai trò nhìn thấy những đối tượng nào
const AUDIENCE = { parent: ['all', 'hs', 'ph'], teacher: ['all', 'gv'], guard: ['all', 'bv'] };
const COLS = 'id, tag, title, body, audience, class_id, created_at, author:profiles!author_id(full_name), classes(name)';

// GET /api/notices  -> thông báo dành cho tôi + trạng thái đã đọc
r.get('/', async (req, res) => {
  const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(60) }), req.query);
  const { role, id: uid } = req.user;
  let q = admin.from('notices').select(COLS).order('created_at', { ascending: false }).limit(limit);
  if (role !== 'admin') {
    q = q.or(`audience.is.null,audience.in.(${AUDIENCE[role].join(',')})`);
    if (role === 'parent') {
      const st = await getStudentOf(uid);
      q = q.or(`class_id.is.null,class_id.eq.${st.class_id}`);
    } else {
      q = q.is('class_id', null);
    }
  }
  const [rows, reads] = await Promise.all([q, admin.from('notice_reads').select('notice_id').eq('user_id', uid)]);
  const read = new Set(unwrap(reads).map(x => x.notice_id));
  res.json(unwrap(rows).map(n => ({ ...n, read: read.has(n.id) })));
});

// GET /api/notices/sent  -> thông báo tôi đã gửi
r.get('/sent', requireRole('admin', 'teacher'), async (req, res) => {
  res.json(unwrap(await admin.from('notices').select(COLS).eq('author_id', req.user.id)
    .order('created_at', { ascending: false }).limit(60)));
});

// POST /api/notices
//  - admin:   { audience: all|hs|ph|gv|bv, title, body, urgent? }
//  - teacher: { class_id, title, body }   (chỉ gửi cho phụ huynh lớp mình phụ trách)
r.post('/', requireRole('admin', 'teacher'), async (req, res) => {
  const base = { title: z.string().trim().min(1).max(150), body: z.string().trim().min(1).max(5000) };
  let row;
  if (req.user.role === 'admin') {
    const b = parse(z.object({
      ...base, audience: z.enum(['all', 'hs', 'ph', 'gv', 'bv']).default('all'), urgent: z.boolean().default(false),
    }), req.body);
    row = { tag: b.urgent ? 'urgent' : 'school', title: b.title, body: b.body, audience: b.audience, class_id: null };
  } else {
    const b = parse(z.object({ ...base, class_id: id }), req.body);
    await assertTeacherOfClass(req.user.id, b.class_id);
    row = { tag: 'cls', title: b.title, body: b.body, audience: 'ph', class_id: b.class_id };
  }
  const saved = unwrap(await admin.from('notices').insert({ ...row, author_id: req.user.id }).select(COLS).single());
  await logActivity('system', `Gửi thông báo "${row.title}" (${row.audience}${row.class_id ? `, lớp ${row.class_id}` : ''})`, req.user.id);
  res.status(201).json(saved);
});

// POST /api/notices/read  { ids: [..] }
r.post('/read', async (req, res) => {
  const { ids } = parse(z.object({ ids: z.array(id).min(1).max(100) }), req.body);
  unwrap(await admin.from('notice_reads').upsert(
    ids.map(n => ({ notice_id: n, user_id: req.user.id })),
    { onConflict: 'notice_id,user_id', ignoreDuplicates: true }));
  res.json({ ok: true });
});

export default r;
