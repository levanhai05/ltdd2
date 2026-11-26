// Tiện ích dùng chung cho phụ huynh / học sinh (tài khoản role = 'parent')
import { api } from './api';
import { p2, todayYMD } from './teacher';

export { p2, todayYMD };

// Học sinh gắn với tài khoản + lớp + GVCN + tuyến xe/trạm (uid không cần nữa: server lấy theo token)
export async function loadStudent() {
  const { class_name, homeroom, ...st } = await api('/parent/student');
  return { ...st, classes: { name: class_name, homeroom_id: homeroom?.id ?? null }, homeroom };
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

// Thời khóa biểu của lớp (server lấy lớp của học sinh theo token)
export const loadClassLessons = () => api('/parent/schedule');

// Tiết đang học / sắp tới hôm nay (dùng lại logic của giáo viên)
export { focusLesson, hm, roomLabel } from './teacher';

// ---------- Bài tập ----------
// Bài tập của lớp + trạng thái nộp của học sinh
export const loadHomework = () => api('/parent/homework');

export const setHomeworkDone = (homeworkId, studentId, done) =>
  api(`/parent/homework/${homeworkId}`, { method: 'PUT', body: { done } });

// ---------- Thông báo ----------
// Thông báo dành cho HS/PH: server đã lọc toàn trường, đúng đối tượng, đúng lớp
export async function loadNotices() {
  const rows = await api('/notices', { query: { limit: 60 } });
  return rows.map(n => ({ id: n.id, tag: n.tag, title: n.title, body: n.body, date: fmtDM(toYMD(new Date(n.created_at))), read: n.read }));
}

export async function markNoticesRead(uid, ids) {
  if (!ids.length) return;
  await api('/notices/read', { method: 'POST', body: { ids } });
}

// ---------- Học phí ----------
export const loadFees = () => api('/parent/fees');
export const payFees = ids => api('/parent/fees/pay', { method: 'POST', body: { ids } });
export const fmtVND = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';

// ---------- Xin nghỉ ----------
export const loadLeaves = () => api('/parent/leaves');
export const createLeave = b => api('/parent/leaves', { method: 'POST', body: b });
export const cancelLeave = id => api(`/parent/leaves/${id}`, { method: 'DELETE' });

// ---------- Điểm danh ----------
export const loadAttendance = (studentId, limit = 30) => api('/parent/attendance', { query: { limit } });

// ---------- Điểm số ----------
export const loadGrades = semester => api('/parent/grades', { query: { semester } });

// ---------- Xe đưa đón ----------
// null nếu học sinh chưa gán tuyến xe; ngược lại { route, trips: { am, pm }, ride }
export const loadBus = () => api('/parent/bus');

export const setRide = (studentId, trip, riding) =>
  api('/parent/bus/ride', { method: 'PUT', body: { trip, riding } });
