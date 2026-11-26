import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { s } from '../../styles';
import { C } from '../../theme';

export function Grades({ sub = 'Học kỳ [I] · Điểm mẫu' }) {
  const gr = [['Toán học', 8.5], ['Ngữ văn', 7.8], ['Tiếng Anh', 9.0], ['Vật lý', 8.0], ['Tin học', 9.5]];
  return (
    <View style={{ flex: 1 }}>
      <Header title="Điểm số" sub={sub} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={[s.card, { backgroundColor: C.soft, borderColor: '#C7D7F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[s.mut, { color: '#1E3A8A' }]}>Điểm trung bình</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: C.primary }}>8.6</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.mut, { color: '#1E3A8A' }]}>Xếp loại</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E3A8A' }}>Giỏi</Text>
          </View>
        </View>
        {gr.map(([m, v]) => (
          <View key={m} style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.h2}>{m}</Text>
              <Text style={{ fontWeight: '700', fontSize: 18, color: C.primary }}>{v.toFixed(1)}</Text>
            </View>
            <View style={s.bar}><View style={[s.barFill, { width: `${v * 10}%` }]} /></View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
