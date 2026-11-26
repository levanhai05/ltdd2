// Tiện ích dùng chung khi gọi Supabase

// Ném lỗi nếu Supabase trả về error, ngược lại trả về data
export const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const p2 = n => String(n).padStart(2, '0');

// Hôm nay -> "14:05", ngày khác -> "25/11 14:05"
export function fmtWhen(iso) {
  const d = new Date(iso);
  const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? hm : `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${hm}`;
}

// "2026-11-25" -> "25/11/2026"
export const fmtDay = ymd => ymd.split('-').reverse().join('/');

// Gộp kết quả admin_account_summary() (không tính tài khoản admin)
export function summarize(rows) {
  const byRole = {};
  let total = 0, locked = 0;
  (rows || []).filter(r => r.acc_role !== 'admin').forEach(r => {
    const n = Number(r.acc_total);
    byRole[r.acc_role] = (byRole[r.acc_role] || 0) + n;
    total += n;
    if (!r.acc_active) locked += n;
  });
  return { byRole, total, locked, active: total - locked };
}

// Nhãn đối tượng nhận thông báo
export const AUDIENCE = { all: 'Toàn trường', hs: 'Học sinh', ph: 'Phụ huynh', gv: 'Giáo viên', bv: 'Bảo vệ' };
