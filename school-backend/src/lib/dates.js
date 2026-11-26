import { config } from '../config.js';

// "YYYY-MM-DD" theo múi giờ của trường (không phụ thuộc giờ máy chủ)
export const todayYMD = () => new Intl.DateTimeFormat('en-CA', { timeZone: config.tz }).format(new Date());

// "HH:MM" theo múi giờ của trường
export const nowHM = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: config.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

export const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
