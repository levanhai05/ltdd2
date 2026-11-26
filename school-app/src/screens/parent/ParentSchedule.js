import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Header } from '../../components/Header';
import { Chip } from '../../components/Chip';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadStudent, loadClassLessons, focusLesson, hm, roomLabel, p2 } from '../../lib/parent';
import { s } from '../../styles';
import { C } from '../../theme';

const fmtDM = d => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;

// Thứ 2 → Thứ 7 của tuần hiện tại (Chủ nhật thì hiện tuần tới)
function weekOf(now = new Date()) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = base.getDay();
  base.setDate(base.getDate() + (dow === 0 ? 1 : 1 - dow));
  return { next: dow === 0, todayIdx: dow === 0 ? -1 : dow - 1, days: Array.from({ length: 6 }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)) };
}

export function ParentSchedule({ profile }) {
  const week = weekOf();
  const [day, setDay] = useState(Math.max(week.todayIdx, 0));
  const { data, loading, error, reload } = useAsync(async () => {
    const st = await loadStudent(profile.id);
    return { st, lessons: await loadClassLessons(st.class_id) };
  }, [profile.id]);

  const lessons = (data?.lessons || []).filter(l => l.weekday === day + 2).sort((a, b) => a.period - b.period);
  const { focus, current } = data ? focusLesson(data.lessons) : {};

  return (
    <View style={{ flex: 1 }}>
      <Header title="Lịch học" sub={`${data ? `Lớp ${data.st.classes?.name} · ` : ''}${week.next ? 'Tuần tới' : 'Tuần này'} ${fmtDM(week.days[0])} – ${fmtDM(week.days[5])}`} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
        {week.days.map((d, i) => (
          <TouchableOpacity key={i} onPress={() => setDay(i)} style={[s.day, i === day && { backgroundColor: C.primary, borderColor: C.primary }]}>
            <Text style={{ fontSize: 11, color: i === day ? '#fff' : C.muted }}>T{i + 2}</Text>
            <Text style={{ fontWeight: '700', color: i === day ? '#fff' : C.text }}>{d.getDate()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && lessons.length === 0 && <Text style={[s.mut, { textAlign: 'center', marginTop: 12 }]}>Không có tiết học</Text>}
        {lessons.map(l => (
          <View key={l.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ width: 56 }}>
              <Text style={{ fontWeight: '700', color: C.primary, fontSize: 15 }}>Tiết {l.period}</Text>
              <Text style={s.mut}>{hm(l.start_time)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.h2}>{l.subjects?.name}</Text>
              <Text style={s.mut}>{[l.room && roomLabel(l.room), l.profiles?.full_name && `GV ${l.profiles.full_name}`].filter(Boolean).join(' · ')}</Text>
            </View>
            {day === week.todayIdx && current && focus?.id === l.id && <Chip label="Đang học" color="#157347" bg="#E8F7EE" />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
