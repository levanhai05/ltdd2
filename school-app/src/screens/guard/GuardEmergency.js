import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import { s } from '../../styles';
import { C } from '../../theme';

export function GuardEmergency({ onBack }) {
  const { data, loading, error, reload } = useAsync(async () =>
    unwrap(await supabase.from('emergency_contacts').select('id, name, phone, icon')
      .order('sort_order').order('id')));

  const call = (name, phone) => {
    const num = (phone || '').replace(/[\s.-]/g, '');
    if (!/^\+?\d+$/.test(num)) { Alert.alert(name, 'Chưa có số điện thoại. Hãy báo quản trị viên cập nhật.'); return; }
    Linking.openURL(`tel:${num}`).catch(() => Alert.alert('Không thể gọi', `Hãy gọi trực tiếp số ${phone}.`));
  };

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Số khẩn cấp" sub="Bấm để mở trình quay số" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && data.length === 0 && <Text style={s.mut}>Chưa có số khẩn cấp nào.</Text>}
        {(data || []).map(c => (
          <TouchableOpacity key={c.id} activeOpacity={0.8} onPress={() => call(c.name, c.phone)}
            style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 }]}>
            <View style={[s.tileIc, { backgroundColor: C.warm }]}><Ionicons name={c.icon || 'call-outline'} size={22} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>{c.name}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.phone ? C.primary : C.muted }}>{c.phone || 'Chưa cập nhật'}</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F7EE', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="call" size={22} color="#157347" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
