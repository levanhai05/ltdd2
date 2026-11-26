import React from 'react';
import { View, Text, ScrollView, Switch, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { DEV } from '../../data/mock';
import { useDevices } from '../../hooks/useDevices';
import { s } from '../../styles';
import { C } from '../../theme';

export function GuardDevices() {
  const { areas, loading, error, reload, setDevice } = useDevices();
  return (
    <View style={{ flex: 1 }}>
      <Header title="Thiết bị" sub="Đèn, quạt, điều hòa theo khu vực" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!areas} onRefresh={reload} />}>
        {loading && !areas && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {areas && areas.length === 0 && <Text style={s.mut}>Chưa có khu vực nào.</Text>}
        {(areas || []).map(a => {
          const on = Object.values(a.dev).filter(Boolean).length;
          return (
            <View key={a.id} style={[s.card, { gap: 4 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.h2}>{a.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: on ? C.primary : C.muted }}>{on ? `${on} đang bật` : 'Đã tắt hết'}</Text>
              </View>
              {Object.entries(a.dev).map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
                  <View style={[s.tileIc, { backgroundColor: v ? C.soft : '#F1F3F7' }]}>
                    <Ionicons name={DEV[k][1]} size={20} color={v ? C.primary : C.muted} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{DEV[k][0]}</Text>
                  <Switch value={v} thumbColor="#fff" trackColor={{ true: C.primary, false: '#C9D2E0' }}
                    onValueChange={val => setDevice(a.id, k, val)} />
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
