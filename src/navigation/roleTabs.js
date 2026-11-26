import React from 'react';
import { ParentSchedule } from '../screens/parent/ParentSchedule';
import { ParentGrades } from '../screens/parent/ParentGrades';
import { TeacherSchedule } from '../screens/teacher/TeacherSchedule';
import { ParentHome } from '../screens/parent/ParentHome';
import { ParentContact } from '../screens/parent/ParentContact';
import { TeacherHome } from '../screens/teacher/TeacherHome';
import { TeacherAttendance } from '../screens/teacher/TeacherAttendance';
import { GuardHome } from '../screens/guard/GuardHome';
import { GuardDevices } from '../screens/guard/GuardDevices';
import { GuardPatrol } from '../screens/guard/GuardPatrol';
import { AdminHome } from '../screens/admin/AdminHome';
import { AdminAccounts } from '../screens/admin/AdminAccounts';
import { AdminCreate } from '../screens/admin/AdminCreate';

// Mỗi role có danh sách tab: [icon, nhãn, màn hình]
export function getTabs(role, { logout, go, profile }) {
  const byRole = {
    parent: [
      ['home-outline', 'Tổng quan', <ParentHome onLogout={logout} go={go} profile={profile} />],
      ['calendar-outline', 'Lịch học', <ParentSchedule profile={profile} />],
      ['bar-chart-outline', 'Điểm số', <ParentGrades profile={profile} />],
      ['chatbubbles-outline', 'Liên hệ', <ParentContact profile={profile} />],
    ],
    teacher: [
      ['home-outline', 'Tổng quan', <TeacherHome onLogout={logout} go={go} profile={profile} />],
      ['calendar-outline', 'Lịch dạy', <TeacherSchedule profile={profile} />],
      ['checkmark-circle-outline', 'Điểm danh', <TeacherAttendance profile={profile} />],
    ],
    guard: [
      ['home-outline', 'Tổng quan', <GuardHome onLogout={logout} go={go} profile={profile} />],
      ['bulb-outline', 'Thiết bị', <GuardDevices />],
      ['shield-checkmark-outline', 'Tuần tra', <GuardPatrol profile={profile} />],
    ],
    admin: [
      ['home-outline', 'Tổng quan', <AdminHome onLogout={logout} go={go} />],
      ['people-outline', 'Tài khoản', <AdminAccounts />],
      ['person-add-outline', 'Cấp mới', <AdminCreate go={go} />],
    ],
  };
  return byRole[role];
}