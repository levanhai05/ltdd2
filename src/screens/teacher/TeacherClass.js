import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadTeaching, loadRoster } from '../../lib/teacher';
import { s } from '../../styles';
import { C } from '../../theme';

const STATUS = {
  present: ['Có mặt', '#157347', '#E8F7EE'],
  late: ['Đi muộn', '#B54708', '#FEF0C7'],
  absent: ['Vắng', '#B42318', '#FEE4E2'],
  none: ['Chưa điểm danh', '#5B6475', '#EEF1F6'],
};

export function TeacherClass({ profile, onBack }) {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useAsync(async () => {
    const { homeroom } = await loadTeaching(profile.id);
    if (!homeroom) return { homeroom: null, students: [], att: {} };
    return { homeroom, ...(await loadRoster(homeroom.id)) };
  }, [profile.id]);

  const students = data?.students || [];
  const att = data?.att || {};
  const present = students.filter(x => att[x.id] && att[x.id].status !== 'absent').length;
  const absent = students.filter(x => att[x.id]?.status === 'absent').length;
  const key = q.trim().toLowerCase();
  const list = students.filter(x => !key || x.full_name.toLowerCase().includes(key) || x.code.toLowerCase().includes(key));

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Lớp chủ nhiệm"
        sub={data?.homeroom ? `Lớp ${data.homeroom.name} · Sĩ số ${students.length}` : ' '} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && !data.homeroom && <Text style={s.mut}>Bạn chưa được phân công chủ nhiệm lớp nào.</Text>}
        {data?.homeroom && (
          <>
            <View style={[s.card, { backgroundColor: C.soft, borderColor: '#C7D7F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View>
                <Text style={[s.mut, { color: '#1E3A8A' }]}>Có mặt hôm nay</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>{present}/{students.length}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.mut, { color: '#1E3A8A' }]}>Vắng</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#B42318' }}>{absent}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#D9E0EC', backgroundColor: '#fff', paddingHorizontal: 14 }}>
              <Ionicons name="search-outline" size={20} color={C.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã học sinh" placeholderTextColor="#7C8799"
                style={{ flex: 1, fontSize: 15, color: C.text }} />
            </View>

            {students.length === 0 && <Text style={s.mut}>Lớp này chưa có học sinh.</Text>}
            {students.length > 0 && list.length === 0 && <Text style={[s.mut, { textAlign: 'center', marginTop: 16 }]}>Không tìm thấy học sinh</Text>}
            {list.map(st => {
              const [label, color, bg] = STATUS[att[st.id]?.status || 'none'];
              return (
                <View key={st.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <Avatar />
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{st.full_name}</Text>
                    <Text style={s.mut}>{st.code}</Text>
                  </View>
                  <Chip label={label} color={color} bg={bg} />
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
