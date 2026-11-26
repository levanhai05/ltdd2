import { HttpError } from '../lib/errors.js';
import { config } from '../config.js';

export const notFound = (req, res, next) => next(new HttpError(404, `Không tìm thấy ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON không hợp lệ' });
  console.error('[error]', err);
  res.status(500).json({ error: config.isProd ? 'Lỗi máy chủ' : String(err?.message || err) });
}
