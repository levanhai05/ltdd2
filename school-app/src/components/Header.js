import React from 'react';
import { View, Text } from 'react-native';
import { s } from '../styles';
import { C, TOP } from '../theme';

export function Header({ title, sub }) {
  return (
    <View style={{ backgroundColor: '#fff', paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderColor: C.border }}>
      <Text style={s.h1}>{title}</Text>
      <Text style={s.mut}>{sub}</Text>
    </View>
  );
}
