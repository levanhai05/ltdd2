import { Router } from 'express';
import { config } from '../config.js';
import { admin } from '../lib/supabase.js';
import { unwrap } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, ymd, idParam } from '../lib/validate.js';
import { getStudentOf } from '../lib/school.js';
import { todayYMD, nowHM, toMin } from '../lib/dates.js';
import { avgOf, rank } from '../lib/grades.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('parent'), async (req, res, next) => {
  req.student = await getStudentOf(req.user.id);
  next();
});

// GET /api/parent/student
r.get('/student', async (req, res) => {
  const { classes, ...st } = req.student;
  let homeroom = null;
  if (classes?.homeroom_id) {
    homeroom = unwrap(await admin.from('profiles').select('id, full_name, phone').eq('id', classes.homeroom_id).maybeSingle());
  }
  res.json({ ...st, class_name: classes?.name || null, homeroom });
});

// GET /api/parent/schedule  -> thời khóa biểu của lớp
r.get('/schedule', async (req, res) => {
  res.json(unwrap(await admin.from('lessons')
    .select('id, weekday, period, start_time, room, subjects(name), profiles:teacher_id(full_name)')
    .eq('class_id', req.student.class_id).order('weekday').order('period')));
});

// GET /api/parent/grades?semester=  -> điểm theo môn + trung bình có hệ số + xếp loại
r.get('/grades', async (req, res) => {
  const { semester } = parse(z.object({ semester: z.coerce.number().int().min(1).max(2).default(config.semester) }), req.query);
  const rows = unwrap(await admin.from('grades')
    .select('id, kind, score, semester, created_at, subjects(id, name)')
    .eq('student_id', req.student.id).eq('semester', semester).order('created_at'));
  const by = new Map();
  rows.forEach(g => {
    const k = g.subjects?.id;
    if (!by.has(k)) by.set(k, { subject_id: k, subject: g.subjects?.name || '', scores: [] });
    by.get(k).scores.push({ id: g.id, kind: g.kind, score: Number(g.score) });
  });
  const subjects = [...by.values()].map(s => {
    const avg = avgOf(s.scores);
    return { ...s, avg: avg == null ? null : Math.round(avg * 100) / 100, rank: rank(avg) };
  });
  const avgs = subjects.filter(s => s.avg != null).map(s => s.avg);
  const overall = avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100 : null;
  res.json({ semester, subjects, overall, rank: rank(overall) });
});

// GET /api/parent/attendance?limit=
r.get('/attendance', async (req, res) => {
  const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(200).default(30) }), req.query);
  res.json(unwrap(await admin.from('attendance').select('id, day, status, checkin_at, note')
    .eq('student_id', req.student.id).order('day', { ascending: false }).limit(limit)));
});

// ---------- Bài tập ----------
// GET /api/parent/homework
r.get('/homework', async (req, res) => {
  const [hw, subs] = await Promise.all([
    admin.from('homework').select('id, title, content, due_date, subjects(name), profiles:teacher_id(full_name)')
      .eq('class_id', req.student.class_id).order('due_date'),
    admin.from('homework_submissions').select('homework_id, done').eq('student_id', req.student.id),
  ]);
  const done = Object.fromEntries(unwrap(subs).map(s => [s.homework_id, s.done]));
  res.json(unwrap(hw).map(h => ({
    id: h.id, title: h.title, content: h.content, due: h.due_date,
    subject: h.subjects?.name || '', teacher: h.profiles?.full_name || '', done: !!done[h.id],
  })));
});

// PUT /api/parent/homework/:id  { done }
r.put('/homework/:id', async (req, res) => {
  const hid = idParam(req);
  const { done } = parse(z.object({ done: z.boolean() }), req.body);
  const hw = unwrap(await admin.from('homework').select('id').eq('id', hid).eq('class_id', req.student.class_id).maybeSingle());
  if (!hw) throw new HttpError(404, 'Không tìm thấy bài tập của lớp này');
  unwrap(await admin.from('homework_submissions').upsert(
    { homework_id: hid, student_id: req.student.id, done, submitted_at: done ? new Date().toISOString() : null },
    { onConflict: 'homework_id,student_id' }));
  res.json({ homework_id: hid, done });
});

// ---------- Học phí ----------
// GET /api/parent/fees
r.get('/fees', async (req, res) => {
  res.json(unwrap(await admin.from('fees').select('id, title, amount, due_date, paid, paid_at')
    .eq('student_id', req.student.id).order('due_date')));
});

// POST /api/parent/fees/:id/pay
// Hiện chỉ đánh dấu "đã đóng". Khi tích hợp cổng thanh toán (VNPay/MoMo...) hãy chuyển việc này
// sang webhook xác nhận giao dịch của cổng, không để client tự gọi.
r.post('/fees/:id/pay', async (req, res) => {
  const fid = idParam(req);
  const rows = unwrap(await admin.from('fees').update({ paid: true, paid_at: todayYMD() })
    .eq('id', fid).eq('student_id', req.student.id).eq('paid', false)
    .select('id, title, amount, due_date, paid, paid_at'));
  if (!rows.length) throw new HttpError(409, 'Khoản phí không tồn tại hoặc đã được đóng');
  res.json(rows[0]);
});

// ---------- Xin nghỉ ----------
// GET /api/parent/leaves
r.get('/leaves', async (req, res) => {
  res.json(unwrap(await admin.from('leave_requests').select('id, from_date, days, reason, note, status, created_at')
    .eq('student_id', req.student.id).order('created_at', { ascending: false })));
});

// POST /api/parent/leaves  { from_date, days, reason, note? }
r.post('/leaves', async (req, res) => {
  const b = parse(z.object({
    from_date: ymd, days: z.number().int().min(1).max(30),
    reason: z.string().trim().min(1).max(300), note: z.string().trim().max(500).nullish(),
  }), req.body);
  const row = unwrap(await admin.from('leave_requests')
    .insert({ student_id: req.student.id, from_date: b.from_date, days: b.days, reason: b.reason, note: b.note || null })
    .select('id, from_date, days, reason, note, status, created_at').single());
  res.status(201).json(row);
});

// ---------- Xe đưa đón ----------
// GET /api/parent/bus
r.get('/bus', async (req, res) => {
  const st = req.student;
  if (!st.bus_route_id) return res.json(null);
  const [rt, stops, trips, rides] = await Promise.all([
    admin.from('bus_routes').select('name, plate, driver, phone').eq('id', st.bus_route_id).single(),
    admin.from('bus_stops').select('id, name, seq, am_time, pm_time').eq('route_id', st.bus_route_id).order('seq'),
    admin.from('bus_trips').select('trip, state, status, note').eq('route_id', st.bus_route_id),
    admin.from('bus_rides').select('trip, riding').eq('student_id', st.id).eq('day', todayYMD()),
  ]);
  const route = unwrap(rt), sl = unwrap(stops), tr = unwrap(trips);
  const ride = { am: true, pm: true, ...Object.fromEntries(unwrap(rides).map(x => [x.trip, x.riding])) };
  const [h, m] = nowHM().split(':').map(Number);
  const mins = h * 60 + m;

  const build = kind => {
    const trip = tr.find(t => t.trip === kind);
    const key = kind === 'am' ? 'am_time' : 'pm_time';
    const list = sl.filter(x => x[key]).sort((a, b) => a[key].localeCompare(b[key]));
    const firstNext = trip?.state === 'current' ? list.findIndex(x => toMin(x[key]) > mins) : -1;
    return {
      state: trip?.state || 'next', status: trip?.status || '', note: trip?.note || '',
      stops: list.map((x, i) => ({
        name: x.name, time: x[key].slice(0, 5), mine: x.id === st.bus_stop_id,
        state: trip?.state === 'done' ? 'done'
          : !trip || trip.state === 'next' ? 'next'
          : firstNext === -1 ? 'done' : i < firstNext - 1 ? 'done' : i === firstNext - 1 ? 'current' : 'next',
      })),
    };
  };
  res.json({ route, trips: { am: build('am'), pm: build('pm') }, ride });
});

// PUT /api/parent/bus/ride  { trip: 'am'|'pm', riding }  -> báo hôm nay có đi xe hay không
r.put('/bus/ride', async (req, res) => {
  const b = parse(z.object({ trip: z.enum(['am', 'pm']), riding: z.boolean() }), req.body);
  unwrap(await admin.from('bus_rides').upsert(
    { student_id: req.student.id, day: todayYMD(), trip: b.trip, riding: b.riding },
    { onConflict: 'student_id,day,trip' }));
  res.json({ trip: b.trip, riding: b.riding });
});

export default r;
