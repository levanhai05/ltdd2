import { admin } from './supabase.js';
import { unwrap } from './db.js';
import { HttpError } from './errors.js';

// Học sinh gắn với tài khoản phụ huynh/học sinh
export async function getStudentOf(uid) {
  const st = unwrap(await admin.from('students')
    .select('id, code, full_name, class_id, bus_route_id, bus_stop_id, classes(name, homeroom_id)')
    .eq('account_id', uid).maybeSingle());
  if (!st) throw new HttpError(404, 'Tài khoản chưa được gắn với học sinh nào. Vui lòng liên hệ nhà trường.');
  return st;
}

// Các lớp giáo viên có quyền: lớp có tiết dạy + lớp chủ nhiệm
export async function teacherScope(uid) {
  const [les, home] = await Promise.all([
    admin.from('lessons').select('class_id, subject_id').eq('teacher_id', uid),
    admin.from('classes').select('id, name').eq('homeroom_id', uid).maybeSingle(),
  ]);
  const lessons = unwrap(les);
  const homeroom = unwrap(home);
  const classIds = new Set(lessons.map(l => l.class_id));
  if (homeroom) classIds.add(homeroom.id);
  return {
    lessons, homeroom, classIds,
    teaches: (classId, subjectId) => lessons.some(l => l.class_id === classId && l.subject_id === subjectId),
  };
}

export async function assertTeacherOfClass(uid, classId) {
  const scope = await teacherScope(uid);
  if (!scope.classIds.has(classId)) throw new HttpError(403, 'Bạn không phụ trách lớp này');
  return scope;
}
