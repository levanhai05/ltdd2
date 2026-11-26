export const nowHHMM = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

// ---------- Điểm danh ----------
export const ATT_STATUS = {
  present: { label: 'Có mặt', color: '#157347', bg: '#E8F7EE' },
  late: { label: 'Đi muộn', color: '#B54708', bg: '#FEF0C7' },
  absent: { label: 'Vắng', color: '#B42318', bg: '#FEE4E2' },
};

export const ATTENDANCE = [
  { id: 1, day: 'T5', date: '19/11', status: 'present', time: '06:52' },
  { id: 2, day: 'T4', date: '18/11', status: 'present', time: '06:48' },
  { id: 3, day: 'T3', date: '17/11', status: 'late', time: '07:12' },
  { id: 4, day: 'T2', date: '16/11', status: 'present', time: '06:55' },
  { id: 5, day: 'T6', date: '13/11', status: 'present', time: '06:50' },
  { id: 6, day: 'T5', date: '12/11', status: 'absent', time: '', note: 'Nghỉ có phép' },
  { id: 7, day: 'T4', date: '11/11', status: 'present', time: '06:47' },
  { id: 8, day: 'T3', date: '10/11', status: 'present', time: '06:53' },
];

// ---------- Xe đưa đón ----------
export const BUS = {
  route: 'Tuyến [Số 3]',
  plate: '[Biển số xe]',
  driver: '[Tên tài xế]',
  phone: '[SĐT tài xế]',
  trips: {
    am: {
      state: 'done',
      status: 'Chuyến sáng đã hoàn thành',
      note: 'Xe đã đến trường lúc [06:58]',
      stops: [
        { name: '[Trạm 1]', time: '06:20', state: 'done' },
        { name: '[Trạm của em]', time: '06:32', state: 'done', mine: true },
        { name: '[Trạm 3]', time: '06:45', state: 'done' },
        { name: 'Trường [Tên trường]', time: '07:00', state: 'done' },
      ],
    },
    pm: {
      state: 'next',
      status: 'Chuyến chiều chưa khởi hành',
      note: 'Xe rời trường lúc [16:30]',
      stops: [
        { name: 'Trường [Tên trường]', time: '16:30', state: 'next' },
        { name: '[Trạm 3]', time: '16:50', state: 'next' },
        { name: '[Trạm của em]', time: '17:05', state: 'next', mine: true },
        { name: '[Trạm 1]', time: '17:20', state: 'next' },
      ],
    },
  },
};

// ---------- Bài tập ----------
export const INIT_HOMEWORK = [
  { id: 1, subject: 'Toán học', title: 'Bài tập chương [3]: [Tên chương]', due: '20/11', left: 'Còn 1 ngày', teacher: 'GV [Tên]', done: false },
  { id: 2, subject: 'Ngữ văn', title: 'Soạn bài "[Tên tác phẩm]"', due: '21/11', left: 'Còn 2 ngày', teacher: 'GV [Tên]', done: false },
  { id: 3, subject: 'Tiếng Anh', title: 'Làm Unit [5] Workbook', due: '22/11', left: 'Còn 3 ngày', teacher: 'GV [Tên]', done: false },
  { id: 4, subject: 'Vật lý', title: 'Báo cáo thí nghiệm [Bài 7]', due: '25/11', left: 'Còn 6 ngày', teacher: 'GV [Tên]', done: true },
  { id: 5, subject: 'Tin học', title: 'Bài thực hành [Excel]', due: '18/11', left: 'Đã quá hạn', teacher: 'GV [Tên]', done: true },
];

// ---------- Giáo viên + chat ----------
export const TEACHERS = [
  { id: 1, name: '[Tên GVCN]', role: 'Giáo viên chủ nhiệm' },
  { id: 2, name: '[Tên GV Toán]', role: 'Toán học' },
  { id: 3, name: '[Tên GV Ngữ văn]', role: 'Ngữ văn' },
  { id: 4, name: '[Tên GV Tiếng Anh]', role: 'Tiếng Anh' },
  { id: 5, name: '[Tên GV Vật lý]', role: 'Vật lý' },
  { id: 6, name: '[Tên GV Tin học]', role: 'Tin học' },
];

export const initChats = () =>
  Object.fromEntries(
    TEACHERS.map(t => [t.id, [{ from: 'gv', text: 'Chào em, em cần thầy/cô hỗ trợ gì không?', time: '08:00' }]]),
  );

// ---------- Thông báo ----------
export const TAG = {
  school: { label: 'Nhà trường', color: '#1E3A8A', bg: '#E4ECFD' },
  cls: { label: 'Lớp', color: '#9A3412', bg: '#FDEBD8' },
  urgent: { label: 'Khẩn', color: '#B42318', bg: '#FEE4E2' },
};

export const INIT_NOTICES = [
  { id: 1, tag: 'school', title: 'Lịch họp phụ huynh học kỳ I', date: '[Ngày]', read: false,
    body: 'Nhà trường tổ chức họp phụ huynh học kỳ I vào [ngày/giờ] tại [địa điểm]. Các em nhắc phụ huynh sắp xếp thời gian tham dự.' },
  { id: 2, tag: 'urgent', title: 'Thay đổi lịch học ngày [Ngày]', date: '19/11', read: false,
    body: 'Do [lý do], lịch học ngày [ngày] được điều chỉnh như sau: [nội dung]. Các em xem lại tab Lịch học.' },
  { id: 3, tag: 'cls', title: 'Nhắc nộp bài tập Toán', date: '18/11', read: false,
    body: 'Cả lớp nộp bài tập chương [3] trước [hạn nộp]. Em nào chưa hoàn thành liên hệ giáo viên bộ môn.' },
  { id: 4, tag: 'school', title: 'Lịch kiểm tra giữa kỳ', date: '15/11', read: true,
    body: 'Kỳ kiểm tra giữa kỳ diễn ra từ [ngày bắt đầu] đến [ngày kết thúc]. Chi tiết lịch thi xem tại bảng tin của trường.' },
];