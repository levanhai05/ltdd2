import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BackHeader } from './BackHeader';
import { TAG } from '../data/studentMock';
import { s } from '../styles';
import { C } from '../theme';

export function NoticeScreen({ title = 'Thông báo', notices, setNotices, onBack }) {
  const [open, setOpen] = useState(null);
  const unread = notices.filter(n => !n.read).length;
  const toggle = id => {
    setOpen(open === id ? null : id);
    setNotices(notices.map(n => (n.id === id ? { ...n, read: true } : n)));
  };
  const readAll = () => setNotices(notices.map(n => ({ ...n, read: true })));
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title={title} sub={unread ? `${unread} thông báo chưa đọc` : 'Đã đọc hết'} onBack={onBack}
        right={unread > 0 ? (
          <TouchableOpacity onPress={readAll} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
            <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Đọc hết</Text>
          </TouchableOpacity>
        ) : null} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}>
        {notices.map(n => {
          const tag = TAG[n.tag];
          const isOpen = open === n.id;
          return (
            <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => toggle(n.id)}
              style={[s.card, { gap: 8 }, !n.read && { borderColor: '#C7D7F7', backgroundColor: '#F7FAFF' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: tag.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: tag.color }}>{tag.label}</Text>
                </View>
                <Text style={[s.mut, { flex: 1 }]}>{n.date}</Text>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} />}
              </View>
              <Text style={s.h2} numberOfLines={isOpen ? undefined : 2}>{n.title}</Text>
              {isOpen && <Text style={{ fontSize: 13, lineHeight: 19, color: C.text }}>{n.body}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}