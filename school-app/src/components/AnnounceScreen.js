import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from './BackHeader';
import { Chip } from './Chip';
import { Field } from './Field';
import { Pills } from './Pills';
import { TextArea } from './TextArea';
import { nowHHMM } from '../data/studentMock';
import { s, L } from '../styles';

// targets: [[key, nhãn], ...] · sent: danh sách đã gửi · onSend(item)
export function AnnounceScreen({ title, sub, targets, sent, onSend, onBack }) {
  const [target, setTarget] = useState(targets[0][0]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const submit = async () => {
    if (!subject.trim() || !content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và nội dung.');
      return;
    }
    const ok = await onSend({ id: Date.now(), target, to: targets.find(t => t[0] === target)[1], title: subject.trim(), content: content.trim(), time: nowHHMM() });
    if (ok === false) return; // gửi thất bại: giữ nguyên nội dung để thử lại
    setSubject('');
    setContent('');
    Alert.alert('Đã gửi', 'Thông báo đã được gửi.');
  };
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title={title} sub={sub} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        <View>
          <Text style={L.label}>Gửi tới</Text>
          <Pills items={targets} value={target} onChange={setTarget} />
        </View>
        <Field icon="text-outline" label="Tiêu đề" placeholder="[Nhập tiêu đề]" value={subject} onChangeText={setSubject} />
        <TextArea label="Nội dung" placeholder="[Nhập nội dung thông báo]" value={content} onChangeText={setContent} />
        <TouchableOpacity style={L.cta} onPress={submit} activeOpacity={0.9}>
          <Ionicons name="paper-plane-outline" size={20} color="#fff" />
          <Text style={L.ctaTxt}>Gửi thông báo</Text>
        </TouchableOpacity>

        <Text style={[s.h2, { marginTop: 4 }]}>Đã gửi</Text>
        {sent.length === 0 && <Text style={s.mut}>Chưa có thông báo nào.</Text>}
        <View style={{ gap: 10 }}>
          {sent.map(n => (
            <View key={n.id} style={[s.card, { gap: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Chip label={n.to} color="#1E3A8A" bg="#E4ECFD" />
                <Text style={s.mut}>{n.when ?? `Hôm nay · ${n.time}`}</Text>
              </View>
              <Text style={s.h2}>{n.title}</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: '#0F172A' }} numberOfLines={3}>{n.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}