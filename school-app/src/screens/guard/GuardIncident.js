import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Pills } from '../../components/Pills';
import { TextArea } from '../../components/TextArea';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { INCIDENT_TYPES } from '../../data/roleMock';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap, fmtWhen } from '../../lib/db';
import { s, L } from '../../styles';
import { C } from '../../theme';

const LIMIT = 50;

export function GuardIncident({ profile, onBack }) {
  const [type, setType] = useState('device');
  const [place, setPlace] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(async () =>
    unwrap(await supabase.from('incidents').select('id, kind, place, description, resolved, created_at')
      .order('created_at', { ascending: false }).limit(LIMIT)));
  const incidents = data || [];
  const open = incidents.filter(i => !i.resolved).length;

  const submit = async () => {
    if (!place.trim() || !desc.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập vị trí và mô tả sự cố.'); return; }
    setBusy(true);
    try {
      unwrap(await supabase.from('incidents').insert({ kind: type, place: place.trim(), description: desc.trim(), guard_id: profile.id }));
      setPlace(''); setDesc(''); setType('device');
      await reload();
      Alert.alert('Đã gửi báo cáo', 'Sự cố đã được ghi nhận.');
    } catch (e) {
      Alert.alert('Gửi thất bại', e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async i => {
    setBusy(true);
    try {
      const rows = unwrap(await supabase.from('incidents').update({ resolved: !i.resolved }).eq('id', i.id).select('id'));
      if (!rows.length) throw new Error('Bạn không có quyền cập nhật sự cố này.');
      await reload();
    } catch (e) {
      Alert.alert('Không cập nhật được', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Báo cáo sự cố" sub={!data ? ' ' : open ? `${open} sự cố chưa xử lý` : 'Không có sự cố tồn đọng'} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <View>
          <Text style={L.label}>Loại sự cố</Text>
          <Pills items={INCIDENT_TYPES} value={type} onChange={setType} />
        </View>
        <Field icon="location-outline" label="Vị trí" placeholder="[VD: Phòng 202, Cổng sau]" value={place} onChangeText={setPlace} />
        <TextArea label="Mô tả" placeholder="[Mô tả sự cố]" value={desc} onChangeText={setDesc} />
        <TouchableOpacity style={[L.cta, { opacity: busy ? 0.6 : 1 }]} onPress={submit} disabled={busy} activeOpacity={0.9}>
          <Ionicons name="paper-plane-outline" size={20} color="#fff" />
          <Text style={L.ctaTxt}>{busy ? 'Đang gửi...' : 'Gửi báo cáo'}</Text>
        </TouchableOpacity>

        <Text style={[s.h2, { marginTop: 4 }]}>Lịch sử báo cáo</Text>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && incidents.length === 0 && <Text style={s.mut}>Chưa có báo cáo nào.</Text>}
        <View style={{ gap: 10 }}>
          {incidents.map(i => (
            <View key={i.id} style={[s.card, { gap: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip label={INCIDENT_TYPES.find(t => t[0] === i.kind)?.[1] || 'Khác'} color="#9A3412" bg="#FDEBD8" />
                <Chip label={i.resolved ? 'Đã xử lý' : 'Chưa xử lý'} color={i.resolved ? '#157347' : '#B54708'} bg={i.resolved ? '#E8F7EE' : '#FEF0C7'} />
              </View>
              <Text style={s.h2}>{i.place}</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: C.text }}>{i.description}</Text>
              <Text style={s.mut}>{fmtWhen(i.created_at)}</Text>
              <TouchableOpacity style={[L.mini, { flex: 0, opacity: busy ? 0.5 : 1 }]} disabled={busy} onPress={() => toggle(i)}>
                <Text style={[L.miniTxt, i.resolved && { color: C.muted }]}>{i.resolved ? 'Mở lại sự cố' : 'Đánh dấu đã xử lý'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {data && data.length >= LIMIT && <Text style={s.mut}>Chỉ hiển thị {LIMIT} báo cáo gần nhất.</Text>}
      </ScrollView>
    </View>
  );
}
