import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Pills } from '../../components/Pills';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { LOG_TYPES } from '../../data/roleMock';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { fmtWhen } from '../../lib/db';
import { s } from '../../styles';
import { C } from '../../theme';

const ICON = { account: 'person-outline', device: 'bulb-outline', system: 'settings-outline' };

export function AdminLogs({ onBack }) {
  const [f, setF] = useState('all');
  const { data: list, loading, error, reload } = useAsync(async () => {
    return api('/admin/logs', { query: { kind: f === 'all' ? undefined : f, limit: 100 } });
  }, [f]);

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Nhật ký hoạt động" sub="100 thao tác gần đây trong hệ thống" onBack={onBack} />
      <Pills items={LOG_TYPES} value={f} onChange={setF} style={{ padding: 16 }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading && !!list} onRefresh={reload} />}>
        {loading && !list && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {list && list.length === 0 && <Text style={s.mut}>Chưa có hoạt động nào.</Text>}
        {(list || []).map(l => (
          <View key={l.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={[s.tileIc, { backgroundColor: C.soft }]}><Ionicons name={ICON[l.kind]} size={20} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{l.text}</Text>
              <Text style={s.mut}>{l.actor ? `${l.actor.full_name} (${l.actor.username})` : 'Hệ thống'}</Text>
            </View>
            <Text style={s.mut}>{fmtWhen(l.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
