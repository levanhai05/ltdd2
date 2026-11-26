import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { fmtWhen } from '../../lib/db';
import { s, L } from '../../styles';
import { C } from '../../theme';

export function GuardPatrol({ profile }) {
  const [done, setDone] = useState({});          // { [id điểm tuần tra]: true }
  const [busy, setBusy] = useState(false);

  const points = useAsync(() => api('/guard/patrol/checkpoints'));
  const logs = useAsync(() => api('/guard/patrol/logs', { query: { recent: 'true', limit: 10 } }));

  const items = points.data || [];
  const ticked = items.filter(p => done[p.id]);
  const n = ticked.length;

  const reloadAll = () => { points.reload(); logs.reload(); };

  const commit = async () => {
    setBusy(true);
    try {
      await api('/guard/patrol', { method: 'POST', body: { checkpoints: ticked.map(p => p.name) } });   // giờ ghi nhận do server đặt
      setDone({});
      await logs.reload();
      Alert.alert('Đã lưu', `Đã ghi nhận ${n} mục tuần tra.`);
    } catch (e) {
      Alert.alert('Không lưu được', e.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (n === 0) { Alert.alert('Chưa có mục nào', 'Hãy đánh dấu các mục đã kiểm tra trước khi lưu.'); return; }
    if (n < items.length) {
      Alert.alert('Chưa xong', `Còn ${items.length - n} mục chưa kiểm tra. Vẫn lưu các mục đã đánh dấu?`, [
        { text: 'Hủy', style: 'cancel' }, { text: 'Lưu', onPress: commit },
      ]);
    } else commit();
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Tuần tra" sub={points.data ? `Đã hoàn thành ${n}/${items.length}` : ' '} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={(points.loading || logs.loading) && !!points.data} onRefresh={reloadAll} />}>
        {points.loading && !points.data && <Loading />}
        {points.error && <ErrorBox message={points.error} onRetry={points.reload} />}
        {points.data && items.length === 0 && <Text style={s.mut}>Chưa có điểm tuần tra nào. Quản trị viên cần thêm vào bảng patrol_checkpoints.</Text>}
        {items.map(p => (
          <TouchableOpacity key={p.id} activeOpacity={0.8} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }]}
            onPress={() => setDone({ ...done, [p.id]: !done[p.id] })}>
            <View style={[L.check, done[p.id] && { backgroundColor: C.primary, borderColor: C.primary }]}>
              {done[p.id] && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: C.text, textDecorationLine: done[p.id] ? 'line-through' : 'none' }}>{p.name}</Text>
          </TouchableOpacity>
        ))}
        {items.length > 0 && (
          <TouchableOpacity style={[L.cta, { marginTop: 6, opacity: busy ? 0.6 : 1 }]} activeOpacity={0.9} disabled={busy} onPress={finish}>
            <Text style={L.ctaTxt}>{busy ? 'Đang lưu...' : 'Hoàn thành tuần tra'}</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.h2, { marginTop: 8 }]}>Ghi nhận gần đây</Text>
        {logs.loading && !logs.data && <Loading />}
        {logs.error && <ErrorBox message={logs.error} onRetry={logs.reload} />}
        {logs.data && logs.data.length === 0 && <Text style={s.mut}>Chưa có lượt tuần tra nào.</Text>}
        {(logs.data || []).length > 0 && (
          <View style={[s.card, { gap: 10 }]}>
            {logs.data.map(l => (
              <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ flex: 1, color: C.text, fontSize: 13 }}>{l.checkpoint}</Text>
                <Text style={s.mut}>{fmtWhen(l.checked_at)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
