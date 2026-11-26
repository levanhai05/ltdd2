import { admin } from './supabase.js';

// Ghi nhật ký hệ thống (activity_logs). Lỗi ghi log không được làm hỏng request chính.
export async function logActivity(kind, text, actorId = null) {
  try {
    await admin.from('activity_logs').insert({ kind, text, actor_id: actorId });
  } catch (e) {
    console.error('[activity_logs]', e.message);
  }
}
