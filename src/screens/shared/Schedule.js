import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { s } from '../../styles';
import { C } from '../../theme';

export function Schedule({ teacher }) {
  const [day, setDay] = useState(0);
  const dates = [18, 19, 20, 21, 22, 23];
  const les = [
    ['Tiết 1', '7:00', 'Ngữ văn', '201'], ['Tiết 2', '7:50', 'Toán học', '201'],
    ['Tiết 3', '8:45', 'Tiếng Anh', 'Lab 2'], ['Tiết 4', '9:35', 'Vật lý', 'Lab 1'],
    ['Tiết 5', '10:25', 'Tin học', 'Phòng máy 3'],
  ];
  return (
    <View style={{ flex: 1 }}>
      <Header title={teacher ? 'Lịch dạy' : 'Lịch học'} sub="Tuần [này]" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
        {dates.map((d, i) => (
          <TouchableOpacity key={d} onPress={() => setDay(i)}
            style={[s.day, i === day && { backgroundColor: C.primary, borderColor: C.primary }]}>
            <Text style={{ fontSize: 11, color: i === day ? '#fff' : C.muted }}>T{i + 2}</Text>
            <Text style={{ fontWeight: '700', color: i === day ? '#fff' : C.text }}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}>
        {les.map(([t, h, m, p]) => (
          <View key={t} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ width: 56 }}>
              <Text style={{ fontWeight: '700', color: C.primary, fontSize: 15 }}>{t}</Text>
              <Text style={s.mut}>{h}</Text>
            </View>
            <View>
              <Text style={s.h2}>{m}</Text>
              <Text style={s.mut}>{teacher ? `Lớp [10A2] · Phòng ${p}` : `Phòng ${p} · GV [Tên]`}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
