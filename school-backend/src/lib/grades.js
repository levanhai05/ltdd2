// Hệ số: miệng 1, 15 phút 1, 1 tiết 2, giữa kỳ 2, cuối kỳ 3 (khớp với app)
export const WEIGHT = { oral: 1, m15: 1, p1: 2, mid: 2, final: 3 };

export const avgOf = rows => {
  const w = rows.reduce((a, r) => a + (WEIGHT[r.kind] || 1), 0);
  return w ? rows.reduce((a, r) => a + Number(r.score) * (WEIGHT[r.kind] || 1), 0) / w : null;
};

export const rank = avg => (avg == null ? null : avg >= 8 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5 ? 'Trung bình' : 'Yếu');
