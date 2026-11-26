import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Pills } from '../../components/Pills';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { fmtWhen } from '../../lib/db';
import { s, L } from '../../styles';
import { C } from '../../theme';

const FILTERS = [['in', 'Đang ở trong'], ['out', 'Đã ra'], ['all', 'Tất cả']];
const LIMIT = 100;

export function GuardVisitors({ profile, onBack }) {
  const [f, setF] = useState('in');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [visit, setVisit] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(() => api('/guard/visitors', { query: { filter: 'all', limit: LIMIT } }));
  const visitors = data || [];
  const list = visitors.filter(v => f === 'all' || (f === 'in' ? !v.out_at : !!v.out_at));
  const inside = visitors.filter(v => !v.out_at).length;

  const add = async () => {
    if (!name.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên khách.'); return; }
    setBusy(true);
    try {
      await api('/guard/visitors', {
        method: 'POST',
        body: { name: name.trim(), visit_to: visit.trim() || 'Chưa ghi', reason: reason.trim() || null },
      });                                                // giờ vào do DB tự ghi (in_at = now())
      setName(''); setVisit(''); setReason(''); setAdding(false); setF('in');
      await reload();
    } catch (e) {
      Alert.alert('Không lưu được', e.message);
    } finally {
      setBusy(false);
    }
  };

  const checkout = async id => {
    setBusy(true);
    try {
      const r = await api(`/guard/visitors/${id}/checkout`, { method: 'PATCH' });
      if (!r.updated) Alert.alert('Đã cập nhật', 'Khách này đã được ghi nhận ra trước đó.');
      await reload();
    } catch (e) {
      Alert.alert('Không ghi nhận được', e.message);
    } finally {
      setBusy(false);
    }
  };

  const now = fmtWhen(new Date().toISOString());
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Nhật ký khách" sub={data ? `${inside} người đang ở trong trường` : ' '} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <TouchableOpacity style={adding ? L.ghost : L.cta} activeOpacity={0.9} onPress={() => setAdding(!adding)}>
          <Ionicons name={adding ? 'close-outline' : 'person-add-outline'} size={20} color={adding ? C.text : '#fff'} />
          <Text style={adding ? { fontSize: 16, fontWeight: '700', color: C.text } : L.ctaTxt}>{adding ? 'Đóng biểu mẫu' : 'Ghi nhận khách vào'}</Text>
        </TouchableOpacity>

        {adding && (
          <View style={[s.card, { gap: 14 }]}>
            <Field icon="person-outline" label="Họ tên khách" placeholder="[Nhập họ tên]" value={name} onChangeText={setName} />
            <Field icon="business-outline" label="Gặp ai / bộ phận" placeholder="[VD: Văn phòng, GVCN 10A2]" value={visit} onChangeText={setVisit} />
            <Field icon="document-text-outline" label="Lý do" placeholder="[VD: Liên hệ công việc]" value={reason} onChangeText={setReason} />
            <TouchableOpacity style={[L.cta, { opacity: busy ? 0.6 : 1 }]} onPress={add} disabled={busy} activeOpacity={0.9}>
              <Text style={L.ctaTxt}>{busy ? 'Đang lưu...' : `Lưu — giờ vào ${now}`}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Pills items={FILTERS} value={f} onChange={setF} />
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && list.length === 0 && <Text style={[s.mut, { textAlign: 'center', marginTop: 12 }]}>Không có khách nào</Text>}
        {list.map(v => (
          <View key={v.id} style={[s.card, { gap: 8 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[s.h2, { flex: 1 }]}>{v.name}</Text>
              <Chip label={v.out_at ? 'Đã ra' : 'Đang ở trong'} color={v.out_at ? C.muted : '#157347'} bg={v.out_at ? '#F1F3F7' : '#E8F7EE'} />
            </View>
            <Text style={s.mut}>Gặp {v.visit_to}{v.reason ? ` · ${v.reason}` : ''}</Text>
            <Text style={s.mut}>Vào {fmtWhen(v.in_at)}{v.out_at ? ` · Ra ${fmtWhen(v.out_at)}` : ''}</Text>
            {!v.out_at && (
              <TouchableOpacity style={[L.mini, { flex: 0, opacity: busy ? 0.5 : 1 }]} disabled={busy} onPress={() => checkout(v.id)}>
                <Text style={L.miniTxt}>Ghi nhận ra ({now})</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {data && data.length >= LIMIT && <Text style={s.mut}>Chỉ hiển thị {LIMIT} lượt gần nhất.</Text>}
      </ScrollView>
    </View>
  );
}
