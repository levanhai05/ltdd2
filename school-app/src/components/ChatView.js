import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from './BackHeader';
import { s } from '../styles';
import { C } from '../theme';

// messages: [{ from: 'me' | 'other', text, time }]
export function ChatView({ title, sub, messages, onSend, onBack }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BackHeader title={title} sub={sub} onBack={onBack} />
      <ScrollView ref={ref} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => ref.current && ref.current.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, gap: 10 }}>
        {messages.map((m, i) => {
          const mine = m.from === 'me';
          return (
            <View key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <View style={{
                backgroundColor: mine ? C.primary : '#fff', borderWidth: mine ? 0 : 1, borderColor: C.border,
                borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <Text style={{ fontSize: 14, color: mine ? '#fff' : C.text }}>{m.text}</Text>
              </View>
              <Text style={[s.mut, { fontSize: 11, marginTop: 2, alignSelf: mine ? 'flex-end' : 'flex-start' }]}>{m.time}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.border }}>
        <TextInput value={text} onChangeText={setText} placeholder="Nhập tin nhắn..." placeholderTextColor="#7C8799" multiline
          style={{ flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 22, borderWidth: 1.5, borderColor: '#D9E0EC', backgroundColor: '#F7FAFF', paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: C.text }} />
        <TouchableOpacity onPress={send} disabled={!text.trim()} accessibilityLabel="Gửi"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}