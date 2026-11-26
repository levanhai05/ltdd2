// Tiện ích dùng chung cho các màn hình của giáo viên
import { api } from './api';

export const SEMESTER = 1;          // học kỳ hiện tại (khớp cột grades.semester)
const LESSON_MIN = 45;              // thời lượng 1 tiết (phút)

export const p2 = n => String(n).padStart(2, '0');

// Hôm nay dạng "YYYY-MM-DD" theo giờ máy
export const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};

// "08:45:00" -> "8:45"
export const hm = t => `${Number(t.slice(0, 2))}:${t.slice(3, 5)}`;

// "201" -> "Phòng 201", "Lab 2" giữ nguyên
export const roomLabel = r => (!r ? '' : /^\d/.test(r) ? `Phòng ${r}` : r);

const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Tải toàn bộ tiết dạy của giáo viên + lớp chủ nhiệm (nếu có) -> { lessons, homeroom }
export const loadTeaching = () => api('/teacher/teaching');

// Các lớp giáo viên có tiết dạy: [[class_id, tên lớp], ...]
export function teachingClasses(lessons) {
  const m = new Map();
  lessons.forEach(l => m.set(l.class_id, l.classes?.name || `Lớp ${l.class_id}`));
  return [...m].sort((a, b) => a[1].localeCompare(b[1], 'vi', { numeric: true }));
}

// Lớp có tiết dạy + lớp chủ nhiệm (dùng cho điểm danh)
export function classOptions(t) {
  const list = teachingClasses(t.lessons);
  if (t.homeroom && !list.some(([id]) => id === t.homeroom.id)) list.push([t.homeroom.id, t.homeroom.name]);
  return list.sort((a, b) => a[1].localeCompare(b[1], 'vi', { numeric: true }));
}

// Các môn giáo viên dạy ở 1 lớp: [[subject_id, tên môn], ...]
export function subjectsOf(lessons, classId) {
  const m = new Map();
  lessons.filter(l => l.class_id === classId).forEach(l => m.set(l.subject_id, l.subjects?.name || `Môn ${l.subject_id}`));
  return [...m];
}

// Tiết đang dạy hoặc tiết sắp tới trong hôm nay
export function focusLesson(lessons, now = new Date()) {
  const d = now.getDay();                       // 0 = Chủ nhật
  if (d === 0) return { today: [], focus: null, current: false };
  const today = lessons.filter(l => l.weekday === d + 1).sort((a, b) => a.period - b.period); // weekday: 2 = Thứ 2
  const mins = now.getHours() * 60 + now.getMinutes();
  const cur = today.find(l => toMin(l.start_time) <= mins && mins < toMin(l.start_time) + LESSON_MIN);
  if (cur) return { today, focus: cur, current: true };
  return { today, focus: today.find(l => toMin(l.start_time) > mins) || null, current: false };
}

// Danh sách học sinh của lớp (+ điểm danh hôm nay nếu withAtt) -> { students, att: { [studentId]: {status, checkin_at, note} } }
export async function loadRoster(classId, withAtt = true) {
  const r = await api(`/teacher/classes/${classId}/roster`, { query: { day: todayYMD() } });
  const att = {};
  const students = r.students.map(({ attendance, ...st }) => {
    if (withAtt && attendance) att[st.id] = attendance;
    return st;
  });
  return { students, att };
}

// Lưu điểm danh: records = [{ student_id, status: 'present'|'late'|'absent', checkin_at? }]
export const saveAttendance = (classId, day, records) =>
  api(`/teacher/classes/${classId}/attendance`, { method: 'PUT', body: { day, records } });

// ---------- Điểm ----------
// Học sinh của lớp + điểm đã nhập của 1 môn. byKey["studentId:kind"] = { id, kind, score } (bản mới nhất)
export async function loadClassGrades(classId, subjectId) {
  const r = await api(`/teacher/classes/${classId}/grades`, { query: { subject_id: subjectId, semester: SEMESTER } });
  const byKey = {};
  const students = r.students.map(({ grades, ...st }) => {
    grades.forEach(g => { byKey[`${st.id}:${g.kind}`] = g; });   // điểm sau (mới hơn) ghi đè điểm trước
    return st;
  });
  return { students, byKey };
}
export const addGrade = g => api('/teacher/grades', { method: 'POST', body: { ...g, semester: SEMESTER } });
export const updateGrade = (id, score) => api(`/teacher/grades/${id}`, { method: 'PATCH', body: { score } });
export const deleteGrade = id => api(`/teacher/grades/${id}`, { method: 'DELETE' });

// ---------- Bài tập ----------
export const loadAssigned = () => api('/teacher/homework', { query: { limit: 30 } });
export const createHomework = b => api('/teacher/homework', { method: 'POST', body: b });
export const deleteHomework = id => api(`/teacher/homework/${id}`, { method: 'DELETE' });
