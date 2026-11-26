import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../styles';
import { C } from '../theme';

// items: [icon, nhãn, màu nền, hàm onPress, số badge (tuỳ chọn)]
export function BadgeTiles({ items }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map(([ic, t, bg, fn, n]) => (
        <TouchableOpacity key={t} activeOpacity={0.85} onPress={fn} style={[s.card, { width: '48%', minHeight: 84, gap: 8 }]}>
          <View style={[s.tileIc, { backgroundColor: bg }]}><Ionicons name={ic} size={22} color={C.primary} /></View>
          <Text style={{ fontWeight: '600', fontSize: 13, color: C.text }}>{t}</Text>
          {n > 0 && (
            <View style={{ position: 'absolute', top: 10, right: 10, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#D92D20', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{n}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}