import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Hero } from '../../components/Hero';
import { Body, Over } from '../../components/Layout';
import { BadgeTiles } from '../../components/BadgeTiles';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import {
  loadStudent, loadClassLessons, loadHomework, loadNotices, focusLesson, hm, roomLabel,
  fmtVND, todayYMD,
} from '../../lib/parent';
import { ATT_STATUS } from '../../data/studentMock';
import { StudentAttendance } from '../student/StudentAttendance';
import { StudentHomework } from '../student/StudentHomework';
import { ParentTuition } from './ParentTuition';
import { ParentLeave } from './ParentLeave';
import { ParentBus } from './ParentBus';
import { ParentNotices } from './ParentNotices';
import { s } from '../../styles';
import { C } from '../../theme';

// Tải toàn bộ số liệu tổng quan trong 1 lần
async function loadHome(profile) {
  const st = await loadStudent(profile.id);
  const [lessons, att, fees, leaves, hw, notices] = await Promise.all([
    loadClassLessons(st.class_id),
    supabase.from('attendance').select('status, checkin_at').eq('student_id', st.id).eq('day', todayYMD()).maybeSingle(),
    supabase.from('fees').select('id, amount, paid').eq('student_id', st.id).eq('paid', false),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('student_id', st.id).eq('status', 'pending'),
    loadHomework(st),
    loadNotices(profile.id, st),
  ]);
  return {
    st, lessons, att: unwrap(att), due: unwrap(fees),
    pendingLeaves: leaves.error ? 0 : leaves.count || 0,
    pendingHw: hw.filter(h => !h.done).length, notices,
  };
}

export function ParentHome({ onLogout, go, profile }) {
  const [view, setView] = useState('home');
  const { data, loading, error, reload } = useAsync(() => loadHome(profile), [profile.id]);
  const back = useCallback(() => { setView('home'); reload(); }, [reload]);
  useHardwareBack(view !== 'home', back);

  if (view !== 'home' && data) {
    const st = data.st;
    if (view === 'tuition') return <ParentTuition student={st} onBack={back} />;
    if (view === 'leave') return <ParentLeave student={st} onBack={back} />;
    if (view === 'bus') return <ParentBus student={st} onBack={back} />;
    if (view === 'homework') return <StudentHomework student={st} onBack={back} />;
    if (view === 'attendance') return <StudentAttendance student={st} onBack={back} />;
    if (view === 'notices') return <ParentNotices profile={profile} student={st} onBack={back} />;
  }

  const st = data?.st;
  const { focus, current } = data ? focusLesson(data.lessons) : {};
  const dueTotal = (data?.due || []).reduce((a, f) => a + Number(f.amount), 0);
  const unread = (data?.notices || []).filter(n => !n.read).length;
  const latest = data?.notices?.[0];
  const A = data?.att ? ATT_STATUS[data.att.status] : null;

  return (
    <Body>
      <Hero name={st ? st.full_name : profile.full_name} sub={st ? `${profile.full_name} · Lớp ${st.classes?.name}` : 'Đang tải…'} onLogout={onLogout} />
      <Over>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setView('attendance')}
              style={[s.card, { backgroundColor: A ? A.bg : '#F1F3F7', borderColor: A ? A.bg : C.border, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Ionicons name={data.att?.status === 'absent' ? 'close-circle-outline' : 'checkmark-circle-outline'} size={28} color={A ? A.color : C.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[s.h2, A && { color: A.color }]}>{A ? (data.att.status === 'absent' ? 'Vắng mặt hôm nay' : data.att.status === 'late' ? 'Đã đến trường (đi muộn)' : 'Đã đến trường') : 'Chưa điểm danh hôm nay'}</Text>
                <Text style={{ fontSize: 12, color: A ? A.color : C.muted }}>
                  {data.att?.checkin_at ? `Vào cổng lúc ${hm(data.att.checkin_at)}` : 'Xem lịch sử điểm danh'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={A ? A.color : C.muted} />
            </TouchableOpacity>

            <View style={s.card}>
              <Text style={[s.mut, { fontWeight: '600' }]}>{current ? 'Tiết học hiện tại' : 'Tiết học tiếp theo'}</Text>
              {focus ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary, width: 64 }}>{hm(focus.start_time)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{focus.subjects?.name}</Text>
                    <Text style={s.mut}>{[focus.room && roomLabel(focus.room), focus.profiles?.full_name && `GV ${focus.profiles.full_name}`].filter(Boolean).join(' · ')}</Text>
                  </View>
                </View>
              ) : <Text style={[s.h2, { marginTop: 8 }]}>Hôm nay không còn tiết học</Text>}
            </View>

            <BadgeTiles items={[
              ['book-outline', 'Bài tập', C.warm, () => setView('homework'), data.pendingHw],
              ['cash-outline', 'Học phí', C.soft, () => setView('tuition'), data.due.length],
              ['bus-outline', 'Xe đưa đón', C.warm, () => setView('bus')],
              ['document-text-outline', 'Xin nghỉ học', C.soft, () => setView('leave'), data.pendingLeaves],
              ['chatbubble-ellipses-outline', 'Nhắn giáo viên', C.warm, () => go(3)],
              ['bar-chart-outline', 'Điểm số', C.soft, () => go(2)],
              ['notifications-outline', 'Thông báo', C.warm, () => setView('notices'), unread],
            ]} />

            {data.due.length > 0 && (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setView('tuition')}
                style={[s.card, { backgroundColor: '#FEF0C7', borderColor: '#F5D78A', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <Ionicons name="cash-outline" size={26} color="#B54708" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.h2, { color: '#7A2E0E' }]}>Học phí cần đóng</Text>
                  <Text style={{ fontSize: 12, color: '#7A2E0E' }}>{fmtVND(dueTotal)} · {data.due.length} khoản chưa thanh toán</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B54708" />
              </TouchableOpacity>
            )}

            <TouchableOpacity activeOpacity={0.85} onPress={() => setView('notices')} style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.h2}>Thông báo từ nhà trường</Text>
                {unread > 0 && <Text style={{ color: C.primary, fontWeight: '600', fontSize: 12 }}>{unread} chưa đọc</Text>}
              </View>
              <Text style={[s.mut, { marginTop: 6 }]} numberOfLines={1}>{latest ? `${latest.title} · ${latest.date}` : 'Chưa có thông báo nào'}</Text>
              <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13, marginTop: 10 }}>Xem tất cả</Text>
            </TouchableOpacity>
          </>
        )}
      </Over>
    </Body>
  );
}
