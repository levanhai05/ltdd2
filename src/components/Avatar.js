import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

export function Avatar({ ic = 'person' }) {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={ic} size={22} color={C.primary} />
    </View>
  );
}
