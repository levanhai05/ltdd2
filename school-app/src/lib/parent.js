// Tiện ích dùng chung cho phụ huynh / học sinh (tài khoản role = 'parent')
import { supabase } from './supabase';
import { unwrap } from './db';
import { p2, todayYMD } from './teacher';

export { p2, todayYMD };

// Học sinh gắn với tài khoản + lớp + GVCN + tuyến xe/trạm
export async function loadStudent(uid) {
  const st = unwrap(await supabase.from('students')
    .select('id, code, full_name, class_id, bus_route_id, bus_stop_id, classes(name, homeroom_id)')
    .eq('account_id', uid).maybeSingle());
  if (!st) throw new Error('Tài khoản chưa được gắn với học sinh nào. Vui lòng liên hệ nhà trường.');
  return st;
}

// "2026-11-25" -> "25/11"
export const fmtDM = ymd => { const [, m, d] = ymd.split('-'); return `${d}/${m}`; };
// Thứ trong tuần từ "YYYY-MM-DD": "T2".."T7", "CN"
export const dowLabel = ymd => { const d = new Date(`${ymd}T00:00:00`).getDay(); return d === 0 ? 'CN' : `T${d + 1}`; };
export const toYMD = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

// Số ngày còn lại tới hạn so với hôm nay (âm = quá hạn)
export const daysLeft = ymd => Math.round((new Date(`${ymd}T00:00:00`) - new Date(`${todayYMD()}T00:00:00`)) / 86400000);
export const leftLabel = ymd => { const n = daysLeft(ymd); return n < 0 ? 'Đã quá hạn' : n === 0 ? 'Hạn hôm nay' : `Còn ${n} ngày`; };

// Xếp loại theo điểm trung bình
export const rank = avg => (avg >= 8 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5 ? 'Trung bình' : 'Yếu');

// Hệ số: miệng 1, 15 phút 1, 1 tiết 2, giữa kỳ 2, cuối kỳ 3
export const WEIGHT = { oral: 1, m15: 1, p1: 2, mid: 2, final: 3 };
export const avgOf = rows => {
  const w = rows.reduce((a, r) => a + (WEIGHT[r.kind] || 1), 0);
  return w ? rows.reduce((a, r) => a + Number(r.score) * (WEIGHT[r.kind] || 1), 0) / w : null;
};

// Thời khóa biểu của lớp
export async function loadClassLessons(classId) {
  return unwrap(await supabase.from('lessons')
    .select('id, weekday, period, start_time, room, subjects(name), profiles:teacher_id(full_name)')
    .eq('class_id', classId).order('weekday').order('period'));
}

// Tiết đang học / sắp tới hôm nay (dùng lại logic của giáo viên)
export { focusLesson, hm, roomLabel } from './teacher';

// ---------- Bài tập ----------
// Bài tập của lớp + trạng thái nộp của học sinh (homework_submissions)
export async function loadHomework(student) {
  const [hw, subs] = await Promise.all([
    supabase.from('homework')
      .select('id, title, content, due_date, subjects(name), profiles:teacher_id(full_name)')
      .eq('class_id', student.class_id).order('due_date'),
    supabase.from('homework_submissions').select('homework_id, done').eq('student_id', student.id),
  ]);
  const done = Object.fromEntries(unwrap(subs).map(r => [r.homework_id, r.done]));
  return unwrap(hw).map(h => ({
    id: h.id, title: h.title, content: h.content, due: h.due_date,
    subject: h.subjects?.name || '', teacher: h.profiles?.full_name || '', done: !!done[h.id],
  }));
}

export async function setHomeworkDone(homeworkId, studentId, done) {
  unwrap(await supabase.from('homework_submissions').upsert(
    { homework_id: homeworkId, student_id: studentId, done, submitted_at: done ? new Date().toISOString() : null },
    { onConflict: 'homework_id,student_id' }));
}

// ---------- Thông báo ----------
// Thông báo dành cho HS/PH: toàn trường, đúng đối tượng, đúng lớp
export async function loadNotices(uid, student) {
  const [nt, rd] = await Promise.all([
    supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(60),
    supabase.from('notice_reads').select('notice_id').eq('user_id', uid),
  ]);
  const read = new Set(unwrap(rd).map(r => r.notice_id));
  return unwrap(nt)
    .filter(n => (!n.audience || ['all', 'hs', 'ph'].includes(n.audience)) && (!n.class_id || n.class_id === student.class_id))
    .map(n => ({ id: n.id, tag: n.tag, title: n.title, body: n.body, date: fmtDM(toYMD(new Date(n.created_at))), read: read.has(n.id) }));
}

export async function markNoticesRead(uid, ids) {
  if (!ids.length) return;
  unwrap(await supabase.from('notice_reads').upsert(ids.map(id => ({ notice_id: id, user_id: uid })), { onConflict: 'notice_id,user_id', ignoreDuplicates: true }));
}

// ---------- Học phí ----------
export async function loadFees(studentId) {
  return unwrap(await supabase.from('fees').select('id, title, amount, due_date, paid, paid_at')
    .eq('student_id', studentId).order('due_date'));
}
export const fmtVND = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';

// ---------- Xin nghỉ ----------
export async function loadLeaves(studentId) {
  return unwrap(await supabase.from('leave_requests')
    .select('id, from_date, days, reason, note, status').eq('student_id', studentId)
    .order('created_at', { ascending: false }));
}

// ---------- Điểm danh ----------
export async function loadAttendance(studentId, limit = 30) {
  return unwrap(await supabase.from('attendance').select('id, day, status, checkin_at, note')
    .eq('student_id', studentId).order('day', { ascending: false }).limit(limit));
}

// ---------- Xe đưa đón ----------
const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export async function loadBus(student) {
  if (!student.bus_route_id) return null;
  const [r, stops, trips, rides] = await Promise.all([
    supabase.from('bus_routes').select('name, plate, driver, phone').eq('id', student.bus_route_id).single(),
    supabase.from('bus_stops').select('id, name, seq, am_time, pm_time').eq('route_id', student.bus_route_id).order('seq'),
    supabase.from('bus_trips').select('trip, state, status, note').eq('route_id', student.bus_route_id),
    supabase.from('bus_rides').select('trip, riding').eq('student_id', student.id).eq('day', todayYMD()),
  ]);
  const route = unwrap(r), st = unwrap(stops), tr = unwrap(trips);
  // bus_rides là bảng bổ sung (parent.sql); nếu chưa chạy thì mặc định "có đi xe"
  const ride = rides.error ? { am: true, pm: true } : { am: true, pm: true, ...Object.fromEntries((rides.data || []).map(x => [x.trip, x.riding])) };
  const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
  const build = kind => {
    const trip = tr.find(t => t.trip === kind);
    const key = kind === 'am' ? 'am_time' : 'pm_time';
    const list = st.filter(x => x[key]).sort((a, b) => a[key].localeCompare(b[key]));
    let firstNext = -1;
    if (trip?.state === 'current') firstNext = list.findIndex(x => toMin(x[key]) > mins);
    return {
      state: trip?.state || 'next', status: trip?.status || '', note: trip?.note || '',
      stops: list.map((x, i) => ({
        name: x.name, time: x[key].slice(0, 5), mine: x.id === student.bus_stop_id,
        state: trip?.state === 'done' ? 'done' : trip?.state === 'next' || !trip ? 'next'
          : firstNext === -1 ? 'done' : i < firstNext - 1 ? 'done' : i === firstNext - 1 ? 'current' : 'next',
      })),
    };
  };
  return { route, trips: { am: build('am'), pm: build('pm') }, ride };
}

export async function setRide(studentId, trip, riding) {
  unwrap(await supabase.from('bus_rides').upsert({ student_id: studentId, day: todayYMD(), trip, riding }, { onConflict: 'student_id,day,trip' }));
}
