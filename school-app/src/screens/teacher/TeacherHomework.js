import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Pills } from '../../components/Pills';
import { TextArea } from '../../components/TextArea';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap, fmtDay } from '../../lib/db';
import { loadTeaching, teachingClasses, subjectsOf, p2 } from '../../lib/teacher';
import { s, L } from '../../styles';
import { C } from '../../theme';

// "25/12" hoặc "25/12/2026" -> "2026-12-25". Không có năm: lấy năm nay, nếu đã qua thì lấy năm sau.
function parseDue(text) {
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(text.trim());
  if (!m) return null;
  const d = +m[1], mo = +m[2];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let y = m[3] ? +m[3] : today.getFullYear();
  let dt = new Date(y, mo - 1, d);
  if (!m[3] && dt < today) { y += 1; dt = new Date(y, mo - 1, d); }
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d || dt < today) return null;   // ngày không tồn tại hoặc đã qua
  return `${y}-${p2(mo)}-${p2(d)}`;
}

export function TeacherHomework({ profile, onBack }) {
  const [cls, setCls] = useState(null);
  const [subj, setSubj] = useState(null);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const teaching = useAsync(() => loadTeaching(profile.id), [profile.id]);
  const lessons = teaching.data?.lessons || [];
  const classes = teachingClasses(lessons);
  const clsId = cls ?? classes[0]?.[0] ?? null;
  const subjects = subjectsOf(lessons, clsId);
  const subjId = subjects.find(([id]) => id === subj)?.[0] ?? subjects[0]?.[0] ?? null;

  // Bài đã giao: kèm số bài đã nộp (homework_submissions.done) và sĩ số lớp
  const list = useAsync(async () => {
    const rows = unwrap(await supabase.from('homework')
      .select('id, class_id, title, content, due_date, classes(name), subjects(name), homework_submissions(count)')
      .eq('teacher_id', profile.id).eq('homework_submissions.done', true)
      .order('created_at', { ascending: false }).limit(30));
    const classIds = [...new Set(rows.map(r => r.class_id))];
    const sizes = {};
    await Promise.all(classIds.map(async id => {
      const { count, error } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('class_id', id);
      if (error) throw new Error(error.message);
      sizes[id] = count || 0;
    }));
    return rows.map(r => ({
      id: r.id, cls: r.classes?.name, subject: r.subjects?.name, title: r.title, content: r.content, due: fmtDay(r.due_date),
      submitted: r.homework_submissions?.[0]?.count || 0, total: sizes[r.class_id] || 0,
    }));
  }, [profile.id]);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên bài tập.'); return; }
    const ymd = parseDue(due);
    if (!ymd) { Alert.alert('Hạn nộp không hợp lệ', 'Nhập ngày/tháng (ví dụ 25/12) hoặc ngày/tháng/năm. Hạn nộp không được là ngày đã qua.'); return; }
    if (!clsId || !subjId) { Alert.alert('Chưa chọn lớp', 'Bạn chưa có lớp nào trong thời khóa biểu.'); return; }
    setBusy(true);
    try {
      unwrap(await supabase.from('homework').insert({
        class_id: clsId, subject_id: subjId, teacher_id: profile.id,
        title: title.trim(), content: content.trim() || null, due_date: ymd,
      }));
      const name = classes.find(([id]) => id === clsId)[1];
      setTitle(''); setDue(''); setContent('');
      await list.reload();
      Alert.alert('Đã giao bài', `Bài tập đã gửi tới lớp ${name}, hạn nộp ${fmtDay(ymd)}.`);
    } catch (e) {
      Alert.alert('Giao bài thất bại', e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = a =>
    Alert.alert('Xóa bài tập?', `${a.title}\nBài nộp của học sinh cũng sẽ bị xóa.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            unwrap(await supabase.from('homework').delete().eq('id', a.id).eq('teacher_id', profile.id));
            await list.reload();
          } catch (e) { Alert.alert('Không xóa được', e.message); }
        },
      },
    ]);

  const assigned = list.data || [];
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Giao bài tập" sub={subjects.find(([id]) => id === subjId)?.[1] || 'Giao cho học sinh'} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        {teaching.loading && !teaching.data && <Loading />}
        {teaching.error && <ErrorBox message={teaching.error} onRetry={teaching.reload} />}
        {teaching.data && classes.length === 0 && <Text style={s.mut}>Bạn chưa có lớp nào trong thời khóa biểu nên chưa giao bài được.</Text>}
        {classes.length > 0 && (
          <>
            <View>
              <Text style={L.label}>Lớp</Text>
              <Pills items={classes} value={clsId} onChange={setCls} />
            </View>
            {subjects.length > 1 && (
              <View>
                <Text style={L.label}>Môn</Text>
                <Pills items={subjects} value={subjId} onChange={setSubj} />
              </View>
            )}
            <Field icon="book-outline" label="Tên bài tập" placeholder="[Nhập tên bài tập]" value={title} onChangeText={setTitle} />
            <Field icon="calendar-outline" label="Hạn nộp" placeholder="Ngày/tháng, ví dụ 25/12"
              keyboardType="numbers-and-punctuation" value={due} onChangeText={setDue} />
            <TextArea label="Nội dung / yêu cầu" placeholder="[Mô tả yêu cầu bài tập]" value={content} onChangeText={setContent} />
            <TouchableOpacity style={[L.cta, { opacity: busy ? 0.6 : 1 }]} onPress={submit} disabled={busy} activeOpacity={0.9}>
              <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              <Text style={L.ctaTxt}>{busy ? 'Đang gửi...' : 'Giao bài tập'}</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[s.h2, { marginTop: 4 }]}>Bài đã giao</Text>
        {list.loading && !list.data && <Loading />}
        {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}
        {list.data && assigned.length === 0 && <Text style={s.mut}>Chưa giao bài nào.</Text>}
        <View style={{ gap: 10 }}>
          {assigned.map(a => (
            <View key={a.id} style={[s.card, { gap: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip label={`Lớp ${a.cls}`} color="#1E3A8A" bg="#E4ECFD" />
                <Text style={s.mut}>Hạn nộp {a.due}</Text>
              </View>
              <Text style={s.h2}>{a.title}</Text>
              {!!a.content && <Text style={{ fontSize: 13, lineHeight: 19, color: C.text }} numberOfLines={2}>{a.content}</Text>}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.mut}>Đã nộp</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>{a.submitted}/{a.total}</Text>
                </View>
                <View style={s.bar}><View style={[s.barFill, { width: `${a.total ? Math.min(100, (a.submitted / a.total) * 100) : 0}%` }]} /></View>
              </View>
              <TouchableOpacity style={[L.mini, { flex: 0 }]} onPress={() => remove(a)}>
                <Text style={[L.miniTxt, { color: '#B42318' }]}>Xóa bài tập</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
