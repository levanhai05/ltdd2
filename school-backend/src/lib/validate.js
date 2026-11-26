import { z } from 'zod';
import { HttpError } from './errors.js';

export { z };

export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    throw new HttpError(400, 'Dữ liệu không hợp lệ',
      r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  }
  return r.data;
}

export const id = z.coerce.number().int().positive();
export const uuid = z.string().uuid();
export const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng phải là YYYY-MM-DD');
export const hhmm = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Định dạng phải là HH:MM');
export const idParam = req => parse(z.object({ id }), req.params).id;
