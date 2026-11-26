import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../styles';
import { C } from '../theme';

export function Tiles({ items }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map(([ic, t, bg, fn]) => (
        <TouchableOpacity key={t} onPress={fn} style={[s.card, { width: '48%', minHeight: 84, gap: 8 }]}>
          <View style={[s.tileIc, { backgroundColor: bg }]}><Ionicons name={ic} size={22} color={C.primary} /></View>
          <Text style={{ fontWeight: '600', fontSize: 13, color: C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
