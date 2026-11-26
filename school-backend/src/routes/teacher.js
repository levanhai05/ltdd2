import { Router } from 'express';
import { config } from '../config.js';
import { admin } from '../lib/supabase.js';
import { unwrap, fetchAll } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, id, ymd, hhmm, idParam } from '../lib/validate.js';
import { teacherScope, assertTeacherOfClass } from '../lib/school.js';
import { todayYMD, nowHM } from '../lib/dates.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('teacher'));

const classParam = req => parse(z.object({ classId: id }), req.params).classId;

// GET /api/teacher/teaching  -> các tiết dạy + lớp chủ nhiệm
r.get('/teaching', async (req, res) => {
  const [les, home] = await Promise.all([
    admin.from('lessons').select('id, class_id, subject_id, weekday, period, start_time, room, classes(name), subjects(name)')
      .eq('teacher_id', req.user.id).order('weekday').order('period'),
    admin.from('classes').select('id, name').eq('homeroom_id', req.user.id).maybeSingle(),
  ]);
  res.json({ lessons: unwrap(les), homeroom: unwrap(home) });
});

// ---------- Điểm danh ----------
// GET /api/teacher/classes/:classId/roster?day=  -> học sinh + điểm danh của ngày
r.get('/classes/:classId/roster', async (req, res) => {
  const classId = classParam(req);
  const { day } = parse(z.object({ day: ymd.default(todayYMD()) }), req.query);
  await assertTeacherOfClass(req.user.id, classId);
  const students = unwrap(await admin.from('students').select('id, code, full_name').eq('class_id', classId).order('code'));
  const att = students.length
    ? unwrap(await admin.from('attendance').select('student_id, status, checkin_at, note').eq('day', day).in('student_id', students.map(s => s.id)))
    : [];
  const m = new Map(att.map(a => [a.student_id, a]));
  res.json({ day, students: students.map(s => ({ ...s, attendance: m.get(s.id) || null })) });
});

// PUT /api/teacher/classes/:classId/attendance
//   { day?, records: [{ student_id, status: present|late|absent, checkin_at?, note? }] }
r.put('/classes/:classId/attendance', async (req, res) => {
  const classId = classParam(req);
  const b = parse(z.object({
    day: ymd.default(todayYMD()),
    records: z.array(z.object({
      student_id: id, status: z.enum(['present', 'late', 'absent']),
      checkin_at: hhmm.nullish(), note: z.string().trim().max(300).nullish(),
    })).min(1).max(200),
  }), req.body);
  await assertTeacherOfClass(req.user.id, classId);

  const ids = [...new Set(b.records.map(x => x.student_id))];
  const ok = unwrap(await admin.from('students').select('id').eq('class_id', classId).in('id', ids));
  if (ok.length !== ids.length) throw new HttpError(400, 'Có học sinh không thuộc lớp này');

  const rows = b.records.map(x => ({
    student_id: x.student_id, day: b.day, status: x.status,
    // không gửi checkin_at -> lấy giờ hiện tại; gửi null rõ ràng -> không ghi giờ vào cổng
    checkin_at: x.status === 'absent' ? null : (x.checkin_at === undefined ? nowHM() : x.checkin_at),
    note: x.note || null,
  }));
  unwrap(await admin.from('attendance').upsert(rows, { onConflict: 'student_id,day' }));
  res.json({ day: b.day, saved: rows.length });
});

// ---------- Điểm ----------
// GET /api/teacher/classes/:classId/grades?subject_id=&semester=
r.get('/classes/:classId/grades', async (req, res) => {
  const classId = classParam(req);
  const q = parse(z.object({ subject_id: id, semester: z.coerce.number().int().min(1).max(2).default(config.semester) }), req.query);
  const scope = await assertTeacherOfClass(req.user.id, classId);
  if (!scope.teaches(classId, q.subject_id)) throw new HttpError(403, 'Bạn không dạy môn này ở lớp này');
  const students = unwrap(await admin.from('students').select('id, code, full_name').eq('class_id', classId).order('code'));
  const grades = students.length
    ? unwrap(await admin.from('grades').select('id, student_id, kind, score, created_at')
        .eq('subject_id', q.subject_id).eq('semester', q.semester).in('student_id', students.map(s => s.id)).order('created_at'))
    : [];
  res.json({
    subject_id: q.subject_id, semester: q.semester,
    students: students.map(s => ({ ...s, grades: grades.filter(g => g.student_id === s.id).map(g => ({ id: g.id, kind: g.kind, score: Number(g.score) })) })),
  });
});

// POST /api/teacher/grades  { student_id, subject_id, kind, score, semester? }
r.post('/grades', async (req, res) => {
  const b = parse(z.object({
    student_id: id, subject_id: id, kind: z.enum(['oral', 'm15', 'p1', 'mid', 'final']),
    score: z.number().min(0).max(10), semester: z.number().int().min(1).max(2).default(config.semester),
  }), req.body);
  const st = unwrap(await admin.from('students').select('class_id').eq('id', b.student_id).maybeSingle());
  if (!st) throw new HttpError(404, 'Không tìm thấy học sinh');
  const scope = await teacherScope(req.user.id);
  if (!scope.teaches(st.class_id, b.subject_id)) throw new HttpError(403, 'Bạn không dạy môn này ở lớp của học sinh');
  const row = unwrap(await admin.from('grades').insert({ ...b, score: Math.round(b.score * 10) / 10, teacher_id: req.user.id })
    .select('id, student_id, subject_id, kind, score, semester').single());
  res.status(201).json(row);
});

// PATCH /api/teacher/grades/:id  { score }   |   DELETE /api/teacher/grades/:id
r.patch('/grades/:id', async (req, res) => {
  const gid = idParam(req);
  const { score } = parse(z.object({ score: z.number().min(0).max(10) }), req.body);
  const rows = unwrap(await admin.from('grades').update({ score: Math.round(score * 10) / 10 })
    .eq('id', gid).eq('teacher_id', req.user.id).select('id, student_id, subject_id, kind, score, semester'));
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy điểm do bạn nhập');
  res.json(rows[0]);
});
r.delete('/grades/:id', async (req, res) => {
  const rows = unwrap(await admin.from('grades').delete().eq('id', idParam(req)).eq('teacher_id', req.user.id).select('id'));
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy điểm do bạn nhập');
  res.status(204).end();
});

// ---------- Bài tập ----------
// GET /api/teacher/homework?class_id=&limit=  (mới giao trước) -> kèm submitted (số bài đã nộp) và total (sĩ số lớp)
r.get('/homework', async (req, res) => {
  const q = parse(z.object({ class_id: id.optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }), req.query);
  let b = admin.from('homework').select('id, class_id, subject_id, title, content, due_date, created_at, classes(name), subjects(name)')
    .eq('teacher_id', req.user.id).order('created_at', { ascending: false }).limit(q.limit);
  if (q.class_id) b = b.eq('class_id', q.class_id);
  const rows = unwrap(await b);
  const hwIds = rows.map(h => h.id);
  const classIds = [...new Set(rows.map(h => h.class_id))];
  const [subs, studs] = await Promise.all([
    hwIds.length ? fetchAll(() => admin.from('homework_submissions').select('homework_id, student_id')
      .in('homework_id', hwIds).eq('done', true).order('homework_id').order('student_id')) : [],
    classIds.length ? fetchAll(() => admin.from('students').select('id, class_id').in('class_id', classIds).order('id')) : [],
  ]);
  const submitted = new Map(), total = new Map();
  subs.forEach(s => submitted.set(s.homework_id, (submitted.get(s.homework_id) || 0) + 1));
  studs.forEach(s => total.set(s.class_id, (total.get(s.class_id) || 0) + 1));
  res.json(rows.map(h => ({ ...h, submitted: submitted.get(h.id) || 0, total: total.get(h.class_id) || 0 })));
});

// POST /api/teacher/homework  { class_id, subject_id, title, content?, due_date }
r.post('/homework', async (req, res) => {
  const b = parse(z.object({
    class_id: id, subject_id: id, title: z.string().trim().min(1).max(200),
    content: z.string().trim().max(5000).nullish(), due_date: ymd,
  }), req.body);
  const scope = await teacherScope(req.user.id);
  if (!scope.teaches(b.class_id, b.subject_id)) throw new HttpError(403, 'Bạn không dạy môn này ở lớp này');
  const row = unwrap(await admin.from('homework').insert({ ...b, content: b.content || null, teacher_id: req.user.id }).select().single());
  res.status(201).json(row);
});

// PATCH /api/teacher/homework/:id  { title?, content?, due_date? }   |   DELETE
r.patch('/homework/:id', async (req, res) => {
  const b = parse(z.object({
    title: z.string().trim().min(1).max(200).optional(), content: z.string().trim().max(5000).nullish(), due_date: ymd.optional(),
  }).refine(v => Object.keys(v).length, 'Không có gì để cập nhật'), req.body);
  const rows = unwrap(await admin.from('homework').update(b).eq('id', idParam(req)).eq('teacher_id', req.user.id).select());
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy bài tập của bạn');
  res.json(rows[0]);
});
r.delete('/homework/:id', async (req, res) => {
  const rows = unwrap(await admin.from('homework').delete().eq('id', idParam(req)).eq('teacher_id', req.user.id).select('id'));
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy bài tập của bạn');
  res.status(204).end();
});

// GET /api/teacher/homework/:id/submissions  -> ai đã làm xong
r.get('/homework/:id/submissions', async (req, res) => {
  const hw = unwrap(await admin.from('homework').select('id, class_id').eq('id', idParam(req)).eq('teacher_id', req.user.id).maybeSingle());
  if (!hw) throw new HttpError(404, 'Không tìm thấy bài tập của bạn');
  const [sts, subs] = await Promise.all([
    admin.from('students').select('id, code, full_name').eq('class_id', hw.class_id).order('code'),
    admin.from('homework_submissions').select('student_id, done, submitted_at').eq('homework_id', hw.id),
  ]);
  const m = new Map(unwrap(subs).map(s => [s.student_id, s]));
  res.json(unwrap(sts).map(s => ({ ...s, done: !!m.get(s.id)?.done, submitted_at: m.get(s.id)?.submitted_at || null })));
});

// ---------- Duyệt đơn xin nghỉ (GVCN) ----------
// GET /api/teacher/leaves?status=pending|approved|rejected
r.get('/leaves', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }), req.query);
  const { homeroom } = await teacherScope(req.user.id);
  if (!homeroom) return res.json([]);
  let b = admin.from('leave_requests')
    .select('id, from_date, days, reason, note, status, created_at, students!inner(id, code, full_name, class_id)')
    .eq('students.class_id', homeroom.id).order('created_at', { ascending: false }).limit(100);
  if (status) b = b.eq('status', status);
  res.json(unwrap(await b));
});

// PATCH /api/teacher/leaves/:id  { status: approved|rejected }
r.patch('/leaves/:id', async (req, res) => {
  const lid = idParam(req);
  const { status } = parse(z.object({ status: z.enum(['approved', 'rejected']) }), req.body);
  const { homeroom } = await teacherScope(req.user.id);
  const lv = unwrap(await admin.from('leave_requests').select('id, status, students!inner(class_id)').eq('id', lid).maybeSingle());
  if (!lv) throw new HttpError(404, 'Không tìm thấy đơn xin nghỉ');
  if (!homeroom || lv.students.class_id !== homeroom.id) throw new HttpError(403, 'Chỉ giáo viên chủ nhiệm được duyệt đơn');
  if (lv.status !== 'pending') throw new HttpError(409, 'Đơn này đã được xử lý');
  res.json(unwrap(await admin.from('leave_requests').update({ status }).eq('id', lid).select().single()));
});

export default r;
