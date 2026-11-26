import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Header } from '../../components/Header';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadStudent, loadGrades, rank } from '../../lib/parent';
import { SEMESTER } from '../../lib/teacher';
import { s } from '../../styles';
import { C } from '../../theme';

const KIND = { oral: 'Miệng', m15: '15 phút', p1: '1 tiết', mid: 'Giữa kỳ', final: 'Cuối kỳ' };
const KIND_ORDER = ['oral', 'm15', 'p1', 'mid', 'final'];

export function ParentGrades({ profile }) {
  const { data, loading, error, reload } = useAsync(async () => {
    const [st, g] = await Promise.all([loadStudent(), loadGrades(SEMESTER)]);
    // Server đã tính điểm trung bình có hệ số từng môn và cả kỳ
    const subjects = g.subjects.filter(x => x.avg != null)
      .map(x => ({ name: x.subject || 'Môn học', list: x.scores, avg: x.avg }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return { st, subjects, overall: g.overall };
  }, [profile.id]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Điểm số" sub={`Học kỳ ${SEMESTER}${data ? ` · ${data.st.full_name}` : ''}`} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && data.subjects.length === 0 && <Text style={[s.mut, { textAlign: 'center', marginTop: 12 }]}>Chưa có điểm nào trong học kỳ này.</Text>}
        {data && data.overall != null && (
          <View style={[s.card, { backgroundColor: C.soft, borderColor: '#C7D7F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={[s.mut, { color: '#1E3A8A' }]}>Điểm trung bình</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: C.primary }}>{data.overall.toFixed(1)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.mut, { color: '#1E3A8A' }]}>Xếp loại</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E3A8A' }}>{rank(data.overall)}</Text>
            </View>
          </View>
        )}
        {data && data.subjects.map(sub => (
          <View key={sub.name} style={[s.card, { gap: 6 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.h2}>{sub.name}</Text>
              <Text style={{ fontWeight: '700', fontSize: 18, color: C.primary }}>{sub.avg.toFixed(1)}</Text>
            </View>
            <View style={s.bar}><View style={[s.barFill, { width: `${sub.avg * 10}%` }]} /></View>
            <Text style={s.mut}>
              {KIND_ORDER.map(k => [k, sub.list.filter(r => r.kind === k)]).filter(([, l]) => l.length)
                .map(([k, l]) => `${KIND[k]}: ${l.map(r => Number(r.score).toFixed(1)).join(', ')}`).join('  ·  ')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
