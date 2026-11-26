export const DEV = { light: ['Đèn', 'bulb-outline'], fan: ['Quạt', 'aperture-outline'], ac: ['Điều hòa', 'snow-outline'] };

export const INIT_AREAS = [
  { id: 'r201', name: 'Phòng [201]', dev: { light: true, fan: true, ac: false } },
  { id: 'r202', name: 'Phòng [202]', dev: { light: true, fan: true, ac: true } },
  { id: 'lab', name: 'Phòng máy [Tin học]', dev: { light: true, fan: false, ac: true } },
  { id: 'hall', name: 'Hành lang tầng [1]', dev: { light: true } },
  { id: 'yard', name: 'Sân trường', dev: { light: true } },
];

export const ROLE_NAME = { parent: 'HS / Phụ huynh', teacher: 'Giáo viên', guard: 'Bảo vệ' };
