import React from 'react';
import { View, Text } from 'react-native';

export function Chip({ label, color, bg }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{label}</Text>
    </View>
  );
}