import React from 'react';
import { View, ScrollView } from 'react-native';

export const Body = ({ children }) => (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>{children}</ScrollView>
);

export const Over = ({ children }) => (
  <View style={{ paddingHorizontal: 16, marginTop: -36, gap: 14 }}>{children}</View>
);
