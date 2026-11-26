import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { admin } from '../lib/supabase.js';
import { unwrap } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, idParam } from '../lib/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';

// ===== Thiết bị cho app (bảo vệ / admin điều khiển) =====
export const devices = Router();
devices.use(authenticate);

// GET /api/devices  -> khu vực + thiết bị
devices.get('/', async (req, res) => {
  const [areas, devs] = await Promise.all([
    admin.from('areas').select('id, name').order('name'),
    admin.from('devices').select('id, area_id, kind, is_on, updated_at').order('id'),
  ]);
  const d = unwrap(devs);
  res.json(unwrap(areas).map(a => ({ ...a, devices: d.filter(x => x.area_id === a.id) })));
});

// PATCH /api/devices/:id  { is_on }
devices.patch('/:id', requireRole('guard', 'admin'), async (req, res) => {
  const { is_on } = parse(z.object({ is_on: z.boolean() }), req.body);
  const rows = unwrap(await admin.from('devices').update({ is_on }).eq('id', idParam(req)).select('id, area_id, kind, is_on, updated_at'));
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy thiết bị');
  res.json(rows[0]);
});

// POST /api/devices/turn-off  { kind?: light|fan|ac, area_id? }  -> tắt hàng loạt
devices.post('/turn-off', requireRole('guard', 'admin'), async (req, res) => {
  const b = parse(z.object({ kind: z.enum(['light', 'fan', 'ac']).optional(), area_id: z.string().max(50).optional() }), req.body);
  let q = admin.from('devices').update({ is_on: false }).eq('is_on', true);
  if (b.kind) q = q.eq('kind', b.kind);
  if (b.area_id) q = q.eq('area_id', b.area_id);
  const rows = unwrap(await q.select('id'));
  res.json({ turned_off: rows.length });
});

// ===== Giao tiếp với ESP32 (xác thực bằng device_key, không dùng JWT) =====
export const iot = Router();
iot.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

iot.use(async (req, res, next) => {
  const key = String(req.headers['x-device-key'] || '');
  if (!key) throw new HttpError(401, 'Thiếu header x-device-key');
  const dev = unwrap(await admin.from('devices').select('id, area_id, kind, is_on').eq('device_key', key).maybeSingle());
  if (!dev) throw new HttpError(401, 'device_key không hợp lệ');
  req.device = dev;
  next();
});

// GET /api/iot/state  -> ESP32 hỏi trạng thái cần đặt (poll mỗi vài giây)
iot.get('/state', (req, res) => res.json({ area_id: req.device.area_id, kind: req.device.kind, is_on: req.device.is_on }));

// POST /api/iot/state  { is_on }  -> ESP32 báo trạng thái thực tế (vd bật tay bằng công tắc)
iot.post('/state', async (req, res) => {
  const { is_on } = parse(z.object({ is_on: z.boolean() }), req.body);
  unwrap(await admin.from('devices').update({ is_on }).eq('id', req.device.id));
  res.json({ ok: true });
});
