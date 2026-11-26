import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Hero } from '../../components/Hero';
import { Body, Over } from '../../components/Layout';
import { BadgeTiles } from '../../components/BadgeTiles';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { useAsync } from '../../hooks/useAsync';
import { useDevices } from '../../hooks/useDevices';
import { DEV } from '../../data/mock';
import { supabase } from '../../lib/supabase';
import { GuardVisitors } from './GuardVisitors';
import { GuardIncident } from './GuardIncident';
import { GuardEmergency } from './GuardEmergency';
import { s } from '../../styles';
import { C } from '../../theme';

// Đếm số dòng khớp điều kiện (không tải dữ liệu về)
async function countRows(q) {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

export function GuardHome({ onLogout, go, profile }) {
  const [view, setView] = useState('home');
  const { areas, loading: devLoading, error: devError, reload: devReload, turnOffAll } = useDevices();
  const { data, loading, error, reload } = useAsync(async () => {
    const [inside, open] = await Promise.all([
      countRows(supabase.from('visitors').select('id', { count: 'exact', head: true }).is('out_at', null)),
      countRows(supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('resolved', false)),
    ]);
    return { inside, open };
  });
  const back = useCallback(() => { setView('home'); reload(); }, [reload]);
  useHardwareBack(view !== 'home', back);

  const count = k => (areas || []).filter(a => a.dev[k]).length;
  const allOff = (k, label) =>
    Alert.alert(`Tắt tất cả ${label}?`, 'Thao tác áp dụng cho mọi khu vực.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Tắt', onPress: () => turnOffAll(k) },
    ]);

  if (view === 'visitors') return <GuardVisitors profile={profile} onBack={back} />;
  if (view === 'incident') return <GuardIncident profile={profile} onBack={back} />;
  if (view === 'emergency') return <GuardEmergency onBack={back} />;

  const inside = data?.inside ?? 0;
  const open = data?.open ?? 0;

  return (
    <Body>
      <Hero name={profile.full_name} sub="Bảo vệ" onLogout={onLogout} />
      <Over>
        {((loading && !data) || (devLoading && !areas)) && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {devError && <ErrorBox message={devError} onRetry={devReload} />}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {Object.entries(DEV).map(([k, [label]]) => (
            <View key={k} style={[s.card, { flex: 1 }]}>
              <Text style={s.mut}>{label} đang bật</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: C.primary }}>{areas ? count(k) : '–'}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={() => setView('visitors')}
          style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={[s.tileIc, { backgroundColor: C.soft }]}><Ionicons name="walk-outline" size={22} color={C.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.mut}>Khách trong trường</Text>
            <Text style={s.h2}>{data ? `${inside} người đang ở trong` : '–'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.muted} />
        </TouchableOpacity>

        <BadgeTiles items={[
          ['bulb-outline', 'Tắt tất cả đèn', C.warm, () => allOff('light', 'đèn')],
          ['aperture-outline', 'Tắt tất cả quạt', C.soft, () => allOff('fan', 'quạt')],
          ['snow-outline', 'Tắt điều hòa', C.warm, () => allOff('ac', 'điều hòa')],
          ['list-outline', 'Xem thiết bị', C.soft, () => go(1)],
          ['walk-outline', 'Nhật ký khách', C.warm, () => setView('visitors'), inside],
          ['warning-outline', 'Báo cáo sự cố', C.soft, () => setView('incident'), open],
          ['shield-checkmark-outline', 'Tuần tra', C.warm, () => go(2)],
          ['call-outline', 'Số khẩn cấp', C.soft, () => setView('emergency')],
        ]} />
      </Over>
    </Body>
  );
}
