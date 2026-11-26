import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../styles';
import { TOP } from '../theme';

export function Hero({ name, sub, onLogout }) {
  return (
    <View style={[s.homeTop, { paddingTop: TOP }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.hiSmall}>Xin chào,</Text>
        <Text style={s.hiName}>{name}</Text>
        <Text style={s.hiSmall}>{sub}</Text>
      </View>
      <TouchableOpacity style={s.bell} onPress={onLogout} accessibilityLabel="Đăng xuất">
        <Ionicons name="log-out-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
