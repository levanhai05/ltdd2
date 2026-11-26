import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { L } from '../styles';
import { C } from '../theme';

export function TextArea({ label, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <Text style={L.label}>{label}</Text>
      <TextInput multiline textAlignVertical="top" placeholderTextColor="#7C8799"
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ minHeight: 110, borderRadius: 16, borderWidth: 1.5, borderColor: focus ? C.primary : '#D9E0EC', backgroundColor: focus ? '#F7FAFF' : '#fff', padding: 14, fontSize: 15, color: C.text }}
        {...props} />
    </View>
  );
}