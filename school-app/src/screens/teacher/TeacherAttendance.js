import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, RefreshControl } from 'react-native';
import { Header } from '../../components/Header';
import { Pills } from '../../components/Pills';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import { loadTeaching, loadRoster, classOptions, focusLesson, todayYMD, p2 } from '../../lib/teacher';
import { s, L } from '../../styles';
import { C } from '../../theme';

export function TeacherAttendance({ profile }) {
  const [cls, setCls] = useState(null);
  const [edits, setEdits] = useState({});   // { [studentId]: 'present' | 'absent' } — chỉ giữ chỗ giáo viên đã đổi
  const [saving, setSaving] = useState(false);

  const teaching = useAsync(() => loadTeaching(profile.id), [profile.id]);
  const t = teaching.data;
  const classes = t ? classOptions(t) : [];
  const { focus } = t ? focusLesson(t.lessons) : {};
  // Mặc định: lớp của tiết đang/sắp dạy, nếu không có thì lớp đầu tiên
  const clsId = cls ?? focus?.class_id ?? classes[0]?.[0] ?? null;
  const clsName = classes.find(([id]) => id === clsId)?.[1];

  const roster = useAsync(async () => (clsId ? { ...(await loadRoster(clsId)), clsId } : null), [clsId]);
  const r = roster.data?.clsId === clsId ? roster.data : null;   // bỏ dữ liệu của lớp cũ khi vừa đổi lớp

  const statusOf = id => edits[id] ?? r?.att[id]?.status ?? 'present';
  const n = r ? r.students.filter(st => statusOf(st.id) !== 'absent').length : 0;

  const pickClass = id => { setCls(id); setEdits({}); };

  const save = async () => {
    setSaving(true);
    try {
      const day = todayYMD();
      const rows = r.students.map(st => {
        const status = statusOf(st.id);
        // Không tự ghi giờ vào lớp: giữ giờ quét cổng cũ (nếu có), vắng thì xóa
        return { student_id: st.id, day, status, checkin_at: status === 'absent' ? null : (r.att[st.id]?.checkin_at ?? null) };
      });
      unwrap(await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,day' }));
      setEdits({});
      await roster.reload();
      Alert.alert('Đã lưu', `Có mặt ${n}/${rows.length} học sinh.`);
    } catch (e) {
      Alert.alert('Không lưu được', e.message);
    } finally {
      setSaving(false);
    }
  };

  const d = new Date();
  const sub = clsName
    ? `Lớp ${clsName} · ${p2(d.getDate())}/${p2(d.getMonth() + 1)}${focus && focus.class_id === clsId ? ` · Tiết ${focus.period} · ${focus.subjects?.name}` : ''}`
    : 'Chọn lớp để điểm danh';

  return (
    <View style={{ flex: 1 }}>
      <Header title="Điểm danh" sub={sub} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={roster.loading && !!r} onRefresh={roster.reload} />}>
        {teaching.loading && !t && <Loading />}
        {teaching.error && <ErrorBox message={teaching.error} onRetry={teaching.reload} />}
        {t && classes.length === 0 && <Text style={s.mut}>Bạn chưa được phân công lớp nào.</Text>}
        {classes.length > 1 && <Pills items={classes} value={clsId} onChange={pickClass} />}

        {roster.loading && !r && clsId && <Loading />}
        {roster.error && <ErrorBox message={roster.error} onRetry={roster.reload} />}
        {r && r.students.length === 0 && <Text style={s.mut}>Lớp này chưa có học sinh.</Text>}
        {r && r.students.length > 0 && (
          <>
            <View style={[s.card, { backgroundColor: C.soft, borderColor: '#C7D7F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[s.h2, { color: '#1E3A8A' }]}>Có mặt</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>{n}/{r.students.length}</Text>
            </View>
            {r.students.map((st, i) => {
              const status = statusOf(st.id);
              const p = status !== 'absent';
              return (
                <View key={st.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <Text style={{ width: 22, color: C.muted, fontWeight: '600' }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{st.full_name}</Text>
                    <Text style={s.mut}>{st.code}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: p ? (status === 'late' ? '#B54708' : '#157347') : '#B42318' }}>
                    {status === 'late' ? 'Đi muộn' : p ? 'Có mặt' : 'Vắng'}
                  </Text>
                  <Switch value={p} thumbColor="#fff" trackColor={{ true: C.primary, false: '#C9D2E0' }}
                    onValueChange={v => setEdits({ ...edits, [st.id]: v ? (r.att[st.id]?.status === 'late' ? 'late' : 'present') : 'absent' })} />
                </View>
              );
            })}
            <TouchableOpacity style={[L.cta, { marginTop: 6, opacity: saving ? 0.6 : 1 }]} activeOpacity={0.9} disabled={saving} onPress={save}>
              <Text style={L.ctaTxt}>{saving ? 'Đang lưu...' : 'Lưu điểm danh'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
