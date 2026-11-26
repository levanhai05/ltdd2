import { Router } from 'express';
import { admin } from '../lib/supabase.js';
import { unwrap } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { parse, z, idParam } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';
import { todayYMD } from '../lib/dates.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('guard', 'admin'));

// ---------- Khách ra vào ----------
// GET /api/guard/visitors?filter=in|out|all&limit=
r.get('/visitors', async (req, res) => {
  const q = parse(z.object({
    filter: z.enum(['in', 'out', 'all']).default('in'),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  }), req.query);
  let b = admin.from('visitors').select('id, name, visit_to, reason, in_at, out_at').order('in_at', { ascending: false }).limit(q.limit);
  if (q.filter === 'in') b = b.is('out_at', null);
  if (q.filter === 'out') b = b.not('out_at', 'is', null);
  res.json(unwrap(await b));
});

// POST /api/guard/visitors  { name, visit_to, reason? }
r.post('/visitors', async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(1).max(100), visit_to: z.string().trim().min(1).max(100),
    reason: z.string().trim().max(300).nullish(),
  }), req.body);
  res.status(201).json(unwrap(await admin.from('visitors')
    .insert({ name: b.name, visit_to: b.visit_to, reason: b.reason || null, guard_id: req.user.id })
    .select('id, name, visit_to, reason, in_at, out_at').single()));
});

// PATCH /api/guard/visitors/:id/checkout
r.patch('/visitors/:id/checkout', async (req, res) => {
  const rows = unwrap(await admin.from('visitors').update({ out_at: new Date().toISOString() })
    .eq('id', idParam(req)).is('out_at', null).select('id, out_at'));
  res.json({ updated: rows.length > 0, visitor: rows[0] || null });   // đã ra trước đó -> updated=false
});

// ---------- Sự cố ----------
// GET /api/guard/incidents?resolved=true|false
r.get('/incidents', async (req, res) => {
  const q = parse(z.object({ resolved: z.enum(['true', 'false']).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
  let b = admin.from('incidents').select('id, kind, place, description, resolved, created_at').order('created_at', { ascending: false }).limit(q.limit);
  if (q.resolved) b = b.eq('resolved', q.resolved === 'true');
  res.json(unwrap(await b));
});

// POST /api/guard/incidents  { kind: device|security|fire|other, place, description }
r.post('/incidents', async (req, res) => {
  const b = parse(z.object({
    kind: z.enum(['device', 'security', 'fire', 'other']),
    place: z.string().trim().min(1).max(100), description: z.string().trim().min(1).max(1000),
  }), req.body);
  const row = unwrap(await admin.from('incidents').insert({ ...b, guard_id: req.user.id })
    .select('id, kind, place, description, resolved, created_at').single());
  await logActivity('system', `Sự cố (${b.kind}) tại ${b.place}`, req.user.id);
  res.status(201).json(row);
});

// PATCH /api/guard/incidents/:id  { resolved }
r.patch('/incidents/:id', async (req, res) => {
  const { resolved } = parse(z.object({ resolved: z.boolean() }), req.body);
  const rows = unwrap(await admin.from('incidents').update({ resolved }).eq('id', idParam(req))
    .select('id, kind, place, description, resolved, created_at'));
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy sự cố');
  res.json(rows[0]);
});

// ---------- Tuần tra ----------
// GET /api/guard/patrol/checkpoints
r.get('/patrol/checkpoints', async (req, res) => {
  res.json(unwrap(await admin.from('patrol_checkpoints').select('id, name').order('sort_order').order('id')));
});

// GET /api/guard/patrol/logs?day=YYYY-MM-DD  (mặc định hôm nay, của chính tôi)
r.get('/patrol/logs', async (req, res) => {
  const { day } = parse(z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayYMD()) }), req.query);
  // Mốc ngày tính theo giờ Việt Nam (UTC+7)
  const from = new Date(`${day}T00:00:00+07:00`);
  const to = new Date(from.getTime() + 86400000);
  res.json(unwrap(await admin.from('patrol_logs').select('id, checkpoint, checked_at')
    .eq('guard_id', req.user.id).gte('checked_at', from.toISOString()).lt('checked_at', to.toISOString())
    .order('checked_at', { ascending: false })));
});

// POST /api/guard/patrol  { checkpoints: ["Cổng chính", ...] }  -> giờ ghi nhận do server đặt
r.post('/patrol', async (req, res) => {
  const { checkpoints } = parse(z.object({ checkpoints: z.array(z.string().trim().min(1).max(100)).min(1).max(50) }), req.body);
  const at = new Date().toISOString();
  unwrap(await admin.from('patrol_logs').insert(checkpoints.map(c => ({ guard_id: req.user.id, checkpoint: c, checked_at: at }))));
  res.status(201).json({ saved: checkpoints.length, checked_at: at });
});

// ---------- Liên hệ khẩn cấp ----------
// GET /api/guard/emergency-contacts
r.get('/emergency-contacts', async (req, res) => {
  res.json(unwrap(await admin.from('emergency_contacts').select('id, name, phone, icon').order('id')));
});

export default r;
