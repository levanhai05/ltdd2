import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { Pills } from '../../components/Pills';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { GRADE_TYPES } from '../../data/roleMock';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import { loadTeaching, teachingClasses, subjectsOf, SEMESTER } from '../../lib/teacher';
import { s, L } from '../../styles';
import { C } from '../../theme';

const num = v => Number(String(v).replace(',', '.'));
const bad = v => v.trim() !== '' && (isNaN(num(v)) || num(v) < 0 || num(v) > 10);
const round1 = v => Math.round(num(v) * 10) / 10;   // cột score là numeric(3,1)

export function TeacherGrades({ profile, onBack }) {
  const [type, setType] = useState('oral');
  const [cls, setCls] = useState(null);
  const [subj, setSubj] = useState(null);
  const [edits, setEdits] = useState({});            // { [loại điểm]: { [studentId]: chuỗi } }
  const [saving, setSaving] = useState(false);

  const teaching = useAsync(() => loadTeaching(profile.id), [profile.id]);
  const lessons = teaching.data?.lessons || [];
  const classes = teachingClasses(lessons);
  const clsId = cls ?? classes[0]?.[0] ?? null;
  const subjects = subjectsOf(lessons, clsId);
  const subjId = subjects.find(([id]) => id === subj)?.[0] ?? subjects[0]?.[0] ?? null;
  const clsName = classes.find(([id]) => id === clsId)?.[1];
  const subjName = subjects.find(([id]) => id === subjId)?.[1];

  // Học sinh của lớp + điểm đã nhập của môn này (lấy bản ghi mới nhất cho mỗi học sinh/loại điểm)
  const grades = useAsync(async () => {
    if (!clsId || !subjId) return null;
    const students = unwrap(await supabase.from('students').select('id, code, full_name').eq('class_id', clsId).order('code'));
    const rows = students.length ? unwrap(await supabase.from('grades')
      .select('id, student_id, kind, score')
      .eq('subject_id', subjId).eq('semester', SEMESTER).in('student_id', students.map(x => x.id))
      .order('created_at', { ascending: false })) : [];
    const byKey = {};
    rows.forEach(g => { const k = `${g.student_id}:${g.kind}`; if (!byKey[k]) byKey[k] = g; });
    return { students, byKey, clsId, subjId };
  }, [clsId, subjId]);
  const g = grades.data && grades.data.clsId === clsId && grades.data.subjId === subjId ? grades.data : null;

  const valueOf = (stId, k = type) => edits[k]?.[stId] ?? (g?.byKey[`${stId}:${k}`] ? String(g.byKey[`${stId}:${k}`].score) : '');
  const label = GRADE_TYPES.find(t => t[0] === type)[1];
  const vals = g ? g.students.map(st => valueOf(st.id)) : [];
  const filled = vals.filter(v => v.trim() !== '' && !bad(v));
  const avg = filled.length ? filled.reduce((a, v) => a + num(v), 0) / filled.length : null;

  const pick = (setter) => v => { setter(v); setEdits({}); };
  const setVal = (stId, v) => setEdits({ ...edits, [type]: { ...edits[type], [stId]: v } });

  const commit = async ({ ins, upd, del }) => {
    setSaving(true);
    try {
      if (ins.length) unwrap(await supabase.from('grades').insert(ins));
      for (const u of upd) unwrap(await supabase.from('grades').update({ score: u.score, teacher_id: profile.id }).eq('id', u.id));
      if (del.length) unwrap(await supabase.from('grades').delete().in('id', del));
      setEdits(e => ({ ...e, [type]: {} }));
      await grades.reload();
      Alert.alert('Đã lưu', `Đã lưu điểm ${label.toLowerCase()}: thêm ${ins.length}, sửa ${upd.length}, xóa ${del.length}.`);
    } catch (e) {
      Alert.alert('Không lưu được', e.message);
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (vals.some(bad)) { Alert.alert('Điểm không hợp lệ', 'Điểm phải là số từ 0 đến 10.'); return; }
    const ins = [], upd = [], del = [];
    g.students.forEach(st => {
      const v = valueOf(st.id).trim();
      const old = g.byKey[`${st.id}:${type}`];
      if (v === '') { if (old) del.push(old.id); return; }
      const score = round1(v);
      if (!old) ins.push({ student_id: st.id, subject_id: subjId, kind: type, score, semester: SEMESTER, teacher_id: profile.id });
      else if (Number(old.score) !== score) upd.push({ id: old.id, score });
    });
    if (!ins.length && !upd.length && !del.length) { Alert.alert('Không có thay đổi', 'Chưa có điểm nào được thêm hoặc sửa.'); return; }
    if (del.length) {
      Alert.alert('Xóa điểm đã lưu?', `${del.length} ô để trống sẽ xóa điểm ${label.toLowerCase()} đã lưu của học sinh đó.`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Lưu', style: 'destructive', onPress: () => commit({ ins, upd, del }) },
      ]);
    } else commit({ ins, upd, del });
  };

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Nhập điểm" sub={clsName ? `Lớp ${clsName} · ${subjName || '–'} · Học kỳ ${SEMESTER === 1 ? 'I' : 'II'}` : ' '} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {teaching.loading && !teaching.data && <Loading />}
        {teaching.error && <ErrorBox message={teaching.error} onRetry={teaching.reload} />}
        {teaching.data && classes.length === 0 && <Text style={s.mut}>Bạn chưa có lớp nào trong thời khóa biểu nên chưa nhập điểm được.</Text>}
        {classes.length > 1 && <Pills items={classes} value={clsId} onChange={pick(setCls)} />}
        {subjects.length > 1 && <Pills items={subjects} value={subjId} onChange={pick(setSubj)} />}
        {clsId && <Pills items={GRADE_TYPES} value={type} onChange={setType} />}

        {grades.loading && !g && clsId && <Loading />}
        {grades.error && <ErrorBox message={grades.error} onRetry={grades.reload} />}
        {g && g.students.length === 0 && <Text style={s.mut}>Lớp này chưa có học sinh.</Text>}
        {g && g.students.length > 0 && (
          <>
            <View style={[s.card, { backgroundColor: C.soft, borderColor: '#C7D7F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View>
                <Text style={[s.mut, { color: '#1E3A8A' }]}>Đã nhập</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>{filled.length}/{vals.length}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.mut, { color: '#1E3A8A' }]}>Điểm trung bình lớp</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>{avg === null ? '–' : avg.toFixed(1)}</Text>
              </View>
            </View>
            {g.students.map((st, i) => (
              <View key={st.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <Text style={{ width: 22, color: C.muted, fontWeight: '600' }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.h2}>{st.full_name}</Text>
                  <Text style={s.mut}>{st.code}</Text>
                </View>
                <TextInput value={vals[i]} onChangeText={v => setVal(st.id, v)} placeholder="–" placeholderTextColor="#7C8799"
                  keyboardType="decimal-pad" maxLength={4}
                  style={{ width: 76, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: bad(vals[i]) ? '#B42318' : '#D9E0EC', backgroundColor: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.text }} />
              </View>
            ))}
            <TouchableOpacity style={[L.cta, { marginTop: 6, opacity: saving ? 0.6 : 1 }]} activeOpacity={0.9} disabled={saving} onPress={save}>
              <Text style={L.ctaTxt}>{saving ? 'Đang lưu...' : `Lưu điểm ${label.toLowerCase()}`}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
