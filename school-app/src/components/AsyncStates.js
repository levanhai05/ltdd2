import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { s, L } from '../styles';
import { C } from '../theme';

export function Loading() {
  return <View style={{ padding: 32, alignItems: 'center' }}><ActivityIndicator color={C.primary} /></View>;
}

export function ErrorBox({ message, onRetry }) {
  return (
    <View style={[s.card, { gap: 10 }]}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#B42318' }}>Không tải được dữ liệu</Text>
      <Text style={s.mut}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={L.mini} onPress={onRetry}><Text style={L.miniTxt}>Thử lại</Text></TouchableOpacity>
      )}
    </View>
  );
}
