import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../theme';

export function Pills({ items, value, onChange, style }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {items.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => onChange(k)}
          style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: value === k ? C.primary : '#fff', borderWidth: 1, borderColor: value === k ? C.primary : C.border }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: value === k ? '#fff' : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}