import { dbError } from './errors.js';

// Nhận { data, error } của supabase-js: ném lỗi nếu có, ngược lại trả data
export const unwrap = ({ data, error }) => {
  if (error) throw dbError(error);
  return data;
};

// PostgREST giới hạn ~1000 dòng/lần: lặp theo trang. build() phải trả về query MỚI mỗi lần gọi.
export async function fetchAll(build, page = 1000) {
  const out = [];
  for (let from = 0; ; from += page) {
    const rows = unwrap(await build().range(from, from + page - 1));
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}
