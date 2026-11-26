import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { BackHeader } from '../../components/BackHeader';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadBus, setRide } from '../../lib/parent';
import { s } from '../../styles';
import { C } from '../../theme';

const TONE = { done: ['#157347', '#E8F7EE'], current: [C.primary, C.soft], next: [C.muted, '#F1F3F7'] };

export function ParentBus({ student, onBack }) {
  const [trip, setTrip] = useState('am');
  const [rideLocal, setRideLocal] = useState({});
  const { data, loading, error, reload } = useAsync(() => loadBus(student), [student.id]);

  if (!loading && data === null && !error)
    return (
      <View style={{ flex: 1 }}>
        <BackHeader title="Xe đưa đón" sub={student.full_name} onBack={onBack} />
        <Text style={[s.mut, { padding: 16 }]}>Học sinh chưa đăng ký tuyến xe đưa đón.</Text>
      </View>
    );
  if (!data)
    return (
      <View style={{ flex: 1 }}>
        <BackHeader title="Xe đưa đón" sub={student.full_name} onBack={onBack} />
        <View style={{ padding: 16 }}>
          {error ? <ErrorBox message={error} onRetry={reload} /> : <Loading />}
        </View>
      </View>
    );

  const { route, trips, ride } = data;
  const BUS = { route: route.name, plate: route.plate || '', driver: route.driver || '', phone: route.phone || '' };
  const t = trips[trip];
  const done = t.state === 'done';
  const riding = trip in rideLocal ? rideLocal[trip] : ride[trip];
  const toggleRide = async v => {
    setRideLocal(r => ({ ...r, [trip]: v }));
    try { await setRide(student.id, trip, v); }
    catch (e) { setRideLocal(r => ({ ...r, [trip]: !v })); Alert.alert('Không cập nhật được', e.message); }
  };
  const call = () => {
    if (!BUS.phone) return;
    Alert.alert('Liên hệ tài xế', `${BUS.driver}\n${BUS.phone}`, [
      { text: 'Đóng', style: 'cancel' }, { text: 'Gọi', onPress: () => Linking.openURL(`tel:${BUS.phone}`) },
    ]);
  };
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Xe đưa đón" sub={[BUS.route, BUS.plate].filter(Boolean).join(' · ')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#EEF2F8', borderRadius: 12, padding: 4 }}>
          {[['am', 'Chuyến sáng'], ['pm', 'Chuyến chiều']].map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTrip(k)}
              style={{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: trip === k ? '#fff' : 'transparent' }}>
              <Text style={{ fontSize: 14, fontWeight: trip === k ? '700' : '500', color: trip === k ? C.primary : C.muted }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 },
          done ? { backgroundColor: '#E8F7EE', borderColor: '#BFE6CC' } : { backgroundColor: C.soft, borderColor: '#C7D7F7' }]}>
          <Ionicons name={done ? 'checkmark-circle-outline' : 'bus-outline'} size={28} color={done ? '#157347' : C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.h2, { color: done ? '#0B5132' : '#1E3A8A' }]}>{t.status || (done ? 'Chuyến đã hoàn thành' : 'Chưa khởi hành')}</Text>
            <Text style={{ fontSize: 12, color: done ? '#0B5132' : '#1E3A8A' }}>{t.note}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={[s.h2, { marginBottom: 14 }]}>Lộ trình</Text>
          {t.stops.map((p, i) => {
            const last = i === t.stops.length - 1;
            const [fg, bg] = TONE[p.state];
            return (
              <View key={p.name + p.time} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center', width: 28 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bg, borderWidth: 2, borderColor: fg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={p.state === 'done' ? 'checkmark' : p.state === 'current' ? 'bus' : 'ellipse-outline'} size={14} color={fg} />
                  </View>
                  {!last && <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: p.state === 'done' ? '#157347' : C.border }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[s.h2, { flex: 1 }]}>{p.name}</Text>
                    <Text style={{ fontWeight: '700', color: C.primary }}>{p.time}</Text>
                  </View>
                  {p.mine && (
                    <View style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: C.warm, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9A3412' }}>Trạm của con</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Đăng ký đi xe</Text>
            <Text style={s.mut}>{trip === 'am' ? 'Chuyến sáng' : 'Chuyến chiều'} hôm nay · tắt nếu con không đi xe</Text>
          </View>
          <Switch value={riding} thumbColor="#fff" trackColor={{ true: C.primary, false: '#C9D2E0' }} onValueChange={toggleRide} />
        </View>

        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Avatar ic="person" />
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>{BUS.driver || 'Tài xế'}</Text>
            <Text style={s.mut}>Tài xế · {BUS.phone}</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Gọi tài xế" onPress={call}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}