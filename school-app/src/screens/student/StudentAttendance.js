import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadAttendance, fmtDM, dowLabel } from '../../lib/parent';
import { hm } from '../../lib/teacher';
import { ATT_STATUS } from '../../data/studentMock';
import { s } from '../../styles';
import { C } from '../../theme';

export function StudentAttendance({ student, onBack }) {
  const { data, loading, error, reload } = useAsync(() => loadAttendance(student.id), [student.id]);
  const rows = data || [];
  const count = k => rows.filter(a => a.status === k).length;
  const rate = rows.length ? Math.round(((count('present') + count('late')) / rows.length) * 100) : 0;
  const latest = rows[0];
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Điểm danh" sub={`${student.full_name} · 30 ngày gần nhất`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <>
            {latest && (
              <View style={[s.card, { backgroundColor: '#E8F7EE', borderColor: '#BFE6CC', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#157347" />
                <View>
                  <Text style={[s.h2, { color: '#0B5132' }]}>Gần nhất: {dowLabel(latest.day)} {fmtDM(latest.day)}</Text>
                  <Text style={{ fontSize: 12, color: '#0B5132' }}>
                    {ATT_STATUS[latest.status].label}{latest.checkin_at ? ` · vào cổng lúc ${hm(latest.checkin_at)}` : ''}
                  </Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {Object.entries(ATT_STATUS).map(([k, st]) => (
                <View key={k} style={[s.card, { flex: 1, backgroundColor: st.bg, borderColor: st.bg, alignItems: 'center', gap: 2 }]}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: st.color }}>{count(k)}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: st.color }}>{st.label}</Text>
                </View>
              ))}
            </View>
            <View style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.h2}>Chuyên cần</Text>
                <Text style={{ fontWeight: '700', fontSize: 16, color: C.primary }}>{rate}%</Text>
              </View>
              <View style={s.bar}><View style={[s.barFill, { width: `${rate}%` }]} /></View>
            </View>
            <Text style={[s.h2, { marginTop: 4 }]}>Chi tiết</Text>
            {rows.length === 0 && <Text style={s.mut}>Chưa có dữ liệu điểm danh.</Text>}
            {rows.map(a => {
              const st = ATT_STATUS[a.status];
              return (
                <View key={a.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <View style={{ width: 52 }}>
                    <Text style={{ fontWeight: '700', color: C.primary, fontSize: 15 }}>{dowLabel(a.day)}</Text>
                    <Text style={s.mut}>{fmtDM(a.day)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{a.checkin_at ? `Vào cổng ${hm(a.checkin_at)}` : a.note || st.label}</Text>
                    {a.status === 'late' && <Text style={s.mut}>Sau giờ vào lớp (07:00)</Text>}
                  </View>
                  <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                    <Text style={{ color: st.color, fontSize: 12, fontWeight: '700' }}>{st.label}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
