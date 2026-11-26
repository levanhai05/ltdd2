export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Chuyển lỗi Postgres/PostgREST sang HTTP status hợp lý
const PG = {
  '23505': [409, 'Dữ liệu đã tồn tại'],
  '23503': [400, 'Dữ liệu tham chiếu không hợp lệ'],
  '23502': [400, 'Thiếu dữ liệu bắt buộc'],
  '23514': [400, 'Giá trị không hợp lệ'],
  '22P02': [400, 'Định dạng dữ liệu không hợp lệ'],
  '22007': [400, 'Định dạng ngày giờ không hợp lệ'],
  PGRST116: [404, 'Không tìm thấy dữ liệu'],
};

export function dbError(error) {
  const [status, msg] = PG[error.code] || [500, error.message];
  return new HttpError(status, msg, status === 500 ? undefined : error.message);
}
