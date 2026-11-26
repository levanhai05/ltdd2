export const fmtVND = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';

export const todayDM = () => {
  const d = new Date();
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
};

export const makeChats = (list, text) =>
  Object.fromEntries(list.map(t => [t.id, [{ from: 'gv', text, time: '08:00' }]]));

// ---------- Phụ huynh ----------
export const INIT_FEES = [
  { id: 1, title: 'Học phí học kỳ I', amount: 4500000, due: '30/11', paid: false },
  { id: 2, title: 'Bán trú tháng 11', amount: 1200000, due: '25/11', paid: false },
  { id: 3, title: 'Xe đưa đón tháng 11', amount: 600000, due: '25/11', paid: true, paidAt: '02/11' },
  { id: 4, title: 'Đồng phục', amount: 850000, due: '10/09', paid: true, paidAt: '05/09' },
];

export const LEAVE_STATUS = {
  pending: { label: 'Chờ duyệt', color: '#B54708', bg: '#FEF0C7' },
  approved: { label: 'Đã duyệt', color: '#157347', bg: '#E8F7EE' },
  rejected: { label: 'Từ chối', color: '#B42318', bg: '#FEE4E2' },
};

export const INIT_LEAVES = [
  { id: 1, date: '12/11', days: 1, reason: 'Ốm', note: '', status: 'approved' },
];

export const INIT_P_NOTICES = [
  { id: 1, tag: 'school', title: 'Lịch họp phụ huynh học kỳ I', date: '[Ngày]', read: false,
    body: 'Nhà trường kính mời quý phụ huynh dự họp phụ huynh học kỳ I vào [ngày/giờ] tại [địa điểm].' },
  { id: 2, tag: 'urgent', title: 'Nhắc nộp học phí học kỳ I', date: '15/11', read: false,
    body: 'Quý phụ huynh vui lòng hoàn thành học phí học kỳ I trước ngày 30/11. Chi tiết xem mục Học phí.' },
  { id: 3, tag: 'cls', title: 'Kết quả kiểm tra giữa kỳ', date: '12/11', read: true,
    body: 'Điểm kiểm tra giữa kỳ đã được cập nhật. Phụ huynh xem tại tab Điểm số.' },
];

export const P_TEACHERS = [
  { id: 1, name: '[Tên GVCN]', role: 'Giáo viên chủ nhiệm' },
  { id: 2, name: '[Tên GV Toán]', role: 'Toán học' },
  { id: 3, name: '[Tên GV Ngữ văn]', role: 'Ngữ văn' },
  { id: 4, name: '[Tên GV Tiếng Anh]', role: 'Tiếng Anh' },
];

// ---------- Giáo viên ----------
export const CLASS_STUDENTS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `[Học sinh ${i + 1}]`,
  code: `HS${String(i + 1).padStart(3, '0')}`,
  present: i !== 3,
}));

export const GRADE_TYPES = [['oral', 'Miệng'], ['m15', '15 phút'], ['p1', '1 tiết'], ['mid', 'Giữa kỳ']];

export const INIT_ASSIGNED = [
  { id: 1, cls: '10A2', title: 'Bài tập chương [3]', due: '20/11', content: '', submitted: 31, total: 40 },
];

// ---------- Bảo vệ ----------
export const INIT_VISITORS = [
  { id: 1, name: '[Khách 1]', visit: '[Văn phòng]', reason: 'Liên hệ công việc', inAt: '07:45', outAt: '' },
  { id: 2, name: '[Phụ huynh em A]', visit: '[GVCN 10A2]', reason: 'Gặp giáo viên', inAt: '08:10', outAt: '08:50' },
  { id: 3, name: '[Nhà cung cấp]', visit: '[Căng tin]', reason: 'Giao hàng', inAt: '09:05', outAt: '' },
];

export const INCIDENT_TYPES = [['device', 'Thiết bị'], ['security', 'An ninh'], ['fire', 'Cháy/điện'], ['other', 'Khác']];

export const INIT_INCIDENTS = [
  { id: 1, type: 'device', place: 'Phòng [202]', desc: 'Quạt trần kêu to khi chạy.', time: '07:20', resolved: false },
];

export const EMERGENCY = [
  ['Công an', '113', 'shield-outline'],
  ['Cứu hỏa', '114', 'flame-outline'],
  ['Cấp cứu', '115', 'medkit-outline'],
  ['Ban giám hiệu', '[SĐT]', 'business-outline'],
];

// ---------- Quản trị ----------
export const CLASS_ATT = [['10A1', 97], ['10A2', 95], ['10A3', 92], ['11A1', 96], ['11A2', 94], ['12A1', 98]];

export const LOG_TYPES = [['all', 'Tất cả'], ['account', 'Tài khoản'], ['device', 'Thiết bị'], ['system', 'Hệ thống']];

export const LOGS = [
  { id: 1, type: 'account', text: 'Cấp tài khoản ph002', actor: 'Quản trị viên', time: '08:30' },
  { id: 2, type: 'account', text: 'Khóa tài khoản ph002', actor: 'Quản trị viên', time: '08:42' },
  { id: 3, type: 'device', text: 'Tắt tất cả đèn hành lang tầng [1]', actor: '[Bảo vệ 1]', time: '17:05' },
  { id: 4, type: 'device', text: 'Tắt điều hòa Phòng máy [Tin học]', actor: '[Bảo vệ 1]', time: '17:08' },
  { id: 5, type: 'system', text: 'Gửi thông báo "Lịch họp phụ huynh"', actor: 'Quản trị viên', time: '09:15' },
  { id: 6, type: 'account', text: 'Cấp lại mật khẩu gv001', actor: 'Quản trị viên', time: '10:02' },
  { id: 7, type: 'system', text: 'Sao lưu dữ liệu tự động', actor: 'Hệ thống', time: '02:00' },
];