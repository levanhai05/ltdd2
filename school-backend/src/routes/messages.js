import { Router } from 'express';
import { admin } from '../lib/supabase.js';
import { unwrap } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, id, uuid } from '../lib/validate.js';
import { getStudentOf, teacherScope } from '../lib/school.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('parent', 'teacher'));

// Danh bạ được phép nhắn tin:
//  - phụ huynh -> giáo viên có tiết dạy ở lớp con + GVCN
//  - giáo viên -> phụ huynh của học sinh thuộc các lớp mình phụ trách
async function contactsOf(user) {
  if (user.role === 'parent') {
    const st = await getStudentOf(user.id);
    const les = unwrap(await admin.from('lessons')
      .select('teacher_id, subjects(name), profiles:teacher_id(full_name)').eq('class_id', st.class_id));
    const map = new Map();
    les.forEach(l => {
      const t = map.get(l.teacher_id) || { id: l.teacher_id, full_name: l.profiles?.full_name || '', role: 'teacher', subjects: [], homeroom: false };
      if (l.subjects?.name && !t.subjects.includes(l.subjects.name)) t.subjects.push(l.subjects.name);
      map.set(l.teacher_id, t);
    });
    const hid = st.classes?.homeroom_id;
    if (hid) {
      const cur = map.get(hid);
      if (cur) cur.homeroom = true;
      else {
        const p = unwrap(await admin.from('profiles').select('id, full_name').eq('id', hid).maybeSingle());
        if (p) map.set(hid, { id: p.id, full_name: p.full_name, role: 'teacher', subjects: [], homeroom: true });
      }
    }
    return [...map.values()];
  }
  const scope = await teacherScope(user.id);
  if (!scope.classIds.size) return [];
  const sts = unwrap(await admin.from('students')
    .select('code, full_name, account_id, classes(name), profiles:account_id(id, full_name)')
    .in('class_id', [...scope.classIds]).not('account_id', 'is', null).order('code'));
  return sts.map(s => ({
    id: s.account_id, full_name: s.profiles?.full_name || '', role: 'parent',
    student: { code: s.code, full_name: s.full_name, class: s.classes?.name },
  }));
}

// GET /api/messages/contacts
r.get('/contacts', async (req, res) => res.json(await contactsOf(req.user)));

// GET /api/messages/recent?limit=  -> mọi tin nhắn của tôi (cũ -> mới), để dựng danh sách hội thoại
r.get('/recent', async (req, res) => {
  const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(500).default(500) }), req.query);
  const me = req.user.id;
  const rows = unwrap(await admin.from('messages').select('id, sender_id, receiver_id, body, created_at')
    .or(`sender_id.eq.${me},receiver_id.eq.${me}`).order('id', { ascending: false }).limit(limit));
  res.json(rows.reverse());
});

// GET /api/messages/with/:userId?limit=&before=<id>  (cũ -> mới)
r.get('/with/:userId', async (req, res) => {
  const other = parse(z.object({ userId: uuid }), req.params).userId;
  const q = parse(z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    before: z.coerce.number().int().positive().optional(),
  }), req.query);
  if (!(await contactsOf(req.user)).some(c => c.id === other)) throw new HttpError(403, 'Bạn không thể nhắn tin với người này');
  const me = req.user.id;
  let b = admin.from('messages').select('id, sender_id, receiver_id, body, created_at')
    .or(`and(sender_id.eq.${me},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${me})`)
    .order('id', { ascending: false }).limit(q.limit);
  if (q.before) b = b.lt('id', q.before);
  res.json(unwrap(await b).reverse());
});

// POST /api/messages  { receiver_id, body }
// Realtime: app vẫn có thể subscribe bảng messages qua Supabase Realtime (RLS chỉ cho người gửi/nhận).
r.post('/', async (req, res) => {
  const b = parse(z.object({ receiver_id: uuid, body: z.string().trim().min(1).max(2000) }), req.body);
  if (!(await contactsOf(req.user)).some(c => c.id === b.receiver_id)) throw new HttpError(403, 'Bạn không thể nhắn tin với người này');
  const row = unwrap(await admin.from('messages')
    .insert({ sender_id: req.user.id, receiver_id: b.receiver_id, body: b.body })
    .select('id, sender_id, receiver_id, body, created_at').single());
  res.status(201).json(row);
});

export default r;
