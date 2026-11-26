import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadHomework, setHomeworkDone, fmtDM, leftLabel } from '../../lib/parent';
import { s, L } from '../../styles';
import { C } from '../../theme';

const FILTERS = [['all', 'Tất cả'], ['todo', 'Chưa nộp'], ['done', 'Đã nộp']];

export function StudentHomework({ student, onBack }) {
  const [f, setF] = useState('all');
  const [busy, setBusy] = useState(null);
  const { data, loading, error, reload } = useAsync(() => loadHomework(student), [student.id]);
  const [local, setLocal] = useState({});               // id -> done (cập nhật ngay trên giao diện)
  const hw = (data || []).map(h => (h.id in local ? { ...h, done: local[h.id] } : h));
  const pending = hw.filter(h => !h.done).length;
  const list = hw.filter(h => f === 'all' || (f === 'todo' ? !h.done : h.done));

  const toggle = async h => {
    setBusy(h.id);
    setLocal(l => ({ ...l, [h.id]: !h.done }));
    try { await setHomeworkDone(h.id, student.id, !h.done); }
    catch (e) { setLocal(l => ({ ...l, [h.id]: h.done })); Alert.alert('Không cập nhật được', e.message); }
    finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Bài tập" sub={data ? (pending ? `Còn ${pending} bài chưa nộp` : 'Đã nộp hết bài tập') : ' '} onBack={onBack} />
      <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
        {FILTERS.map(([k, t]) => (
          <TouchableOpacity key={k} onPress={() => setF(k)}
            style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: f === k ? C.primary : '#fff', borderWidth: 1, borderColor: f === k ? C.primary : C.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: f === k ? '#fff' : C.text }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => { setLocal({}); reload(); }} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && list.length === 0 && <Text style={[s.mut, { textAlign: 'center', marginTop: 24 }]}>Không có bài tập nào</Text>}
        {list.map(h => {
          const late = leftLabel(h.due) === 'Đã quá hạn';
          return (
            <View key={h.id} style={[s.card, { gap: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E3A8A' }}>{h.subject}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: h.done ? '#157347' : late ? '#B42318' : '#B54708' }}>
                  {h.done ? 'Đã nộp' : leftLabel(h.due)}
                </Text>
              </View>
              <Text style={s.h2}>{h.title}</Text>
              {!!h.content && <Text style={s.mut}>{h.content}</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={16} color={C.muted} />
                <Text style={s.mut}>Hạn nộp {fmtDM(h.due)}{h.teacher ? ` · ${h.teacher}` : ''}</Text>
              </View>
              <TouchableOpacity style={[L.mini, { flex: 0, opacity: busy === h.id ? 0.5 : 1 }]} disabled={busy === h.id} onPress={() => toggle(h)} activeOpacity={0.8}>
                <Text style={[L.miniTxt, h.done && { color: C.muted }]}>{h.done ? 'Hủy đánh dấu đã nộp' : 'Đánh dấu đã nộp'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
