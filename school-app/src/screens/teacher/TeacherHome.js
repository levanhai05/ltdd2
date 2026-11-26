import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Hero } from '../../components/Hero';
import { Body, Over } from '../../components/Layout';
import { Tiles } from '../../components/Tiles';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { loadTeaching, loadRoster, focusLesson, hm, roomLabel } from '../../lib/teacher';
import { TeacherClass } from './TeacherClass';
import { TeacherGrades } from './TeacherGrades';
import { TeacherHomework } from './TeacherHomework';
import { TeacherAnnounce } from './TeacherAnnounce';
import { s } from '../../styles';
import { C } from '../../theme';

export function TeacherHome({ onLogout, go, profile }) {
  const [view, setView] = useState('home');
  const { data, loading, error, reload } = useAsync(async () => {
    const t = await loadTeaching(profile.id);
    let size = null;
    if (t.homeroom) size = (await loadRoster(t.homeroom.id, false)).students.length;
    return { ...t, size };
  }, [profile.id]);
  const back = useCallback(() => setView('home'), []);
  useHardwareBack(view !== 'home', back);

  if (view === 'class') return <TeacherClass profile={profile} onBack={back} />;
  if (view === 'grades') return <TeacherGrades profile={profile} onBack={back} />;
  if (view === 'homework') return <TeacherHomework profile={profile} onBack={back} />;
  if (view === 'announce') return <TeacherAnnounce profile={profile} onBack={back} />;

  const { today, focus, current } = data ? focusLesson(data.lessons) : { today: [], focus: null, current: false };
  const subjects = data ? [...new Set(data.lessons.map(l => l.subjects?.name).filter(Boolean))] : [];

  return (
    <Body>
      <Hero name={profile.full_name} sub={subjects.length ? `Giáo viên bộ môn ${subjects.join(', ')}` : 'Giáo viên'} onLogout={onLogout} />
      <Over>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <View style={s.card}>
            <Text style={[s.mut, { fontWeight: '600' }]}>{current ? 'Đang dạy' : 'Tiết dạy tiếp theo'}</Text>
            {focus ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary, width: 64 }}>{hm(focus.start_time)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.h2}>Lớp {focus.classes?.name}</Text>
                  <Text style={s.mut}>Tiết {focus.period} · {focus.subjects?.name}{focus.room ? ` · ${roomLabel(focus.room)}` : ''}</Text>
                </View>
              </View>
            ) : (
              <Text style={[s.h2, { marginTop: 8 }]}>{today.length ? 'Đã hết tiết dạy hôm nay' : 'Hôm nay không có tiết dạy'}</Text>
            )}
          </View>
        )}
        <Tiles items={[
          ['checkmark-circle-outline', 'Điểm danh', C.soft, () => go(2)], ['create-outline', 'Nhập điểm', C.warm, () => setView('grades')],
          ['book-outline', 'Giao bài tập', C.soft, () => setView('homework')], ['megaphone-outline', 'Gửi thông báo', C.warm, () => setView('announce')],
        ]} />
        <TouchableOpacity activeOpacity={0.85} style={s.card} disabled={!data?.homeroom} onPress={() => setView('class')}>
          <Text style={s.h2}>Lớp chủ nhiệm</Text>
          <Text style={[s.mut, { marginTop: 6 }]}>
            {!data ? ' ' : data.homeroom ? `Lớp ${data.homeroom.name} · Sĩ số ${data.size ?? 0}` : 'Bạn không chủ nhiệm lớp nào'}
          </Text>
        </TouchableOpacity>
      </Over>
    </Body>
  );
}
