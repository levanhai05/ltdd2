import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { L } from '../styles';
import { C } from '../theme';

export function Field({ icon, label, right, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <Text style={L.label}>{label}</Text>
      <View style={[L.field, focus && L.fieldOn]}>
        <View style={[L.badge, focus && L.badgeOn]}>
          <Ionicons name={icon} size={20} color={focus ? '#fff' : C.primary} />
        </View>
        <TextInput style={L.input} placeholderTextColor="#7C8799"
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...props} />
        {right}
      </View>
    </View>
  );
}
