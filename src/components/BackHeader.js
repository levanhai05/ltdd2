import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../styles';
import { C, TOP } from '../theme';

export function BackHeader({ title, sub, onBack, right }) {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <View style={{ backgroundColor: '#fff', paddingTop: TOP, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Quay lại"
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.h1} numberOfLines={1}>{title}</Text>
          {!!sub && <Text style={s.mut} numberOfLines={1}>{sub}</Text>}
        </View>
        {right}
      </View>
    </>
  );
}