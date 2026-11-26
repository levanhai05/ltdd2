import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Pills } from '../../components/Pills';
import { TextArea } from '../../components/TextArea';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadLeaves, createLeave, cancelLeave, fmtDM, toYMD, todayYMD } from '../../lib/parent';
import { LEAVE_STATUS } from '../../data/roleMock';
import { s, L } from '../../styles';

const REASONS = [['sick', 'Ốm'], ['family', 'Việc gia đình'], ['other', 'Khác']];
const DAYS = [['1', '1 ngày'], ['2', '2 ngày'], ['3', '3 ngày']];

// "21/11" -> "2026-11-21" (null nếu sai định dạng hoặc ngày không tồn tại)
function parseDM(text) {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo] = [Number(m[1]), Number(m[2])];
  const today = new Date();
  let dt = new Date(today.getFullYear(), mo - 1, d);
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  if (dt < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)) dt = new Date(today.getFullYear() + 1, mo - 1, d);
  return toYMD(dt);
}

export function ParentLeave({ student, onBack }) {
  const [date, setDate] = useState('');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('sick');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => loadLeaves(student.id), [student.id]);

  const submit = async () => {
    const ymd = parseDM(date);
    if (!ymd) { Alert.alert('Ngày không hợp lệ', 'Nhập ngày nghỉ theo dạng ngày/tháng, ví dụ 21/11.'); return; }
    if (ymd < todayYMD()) { Alert.alert('Ngày không hợp lệ', 'Ngày nghỉ không được ở trong quá khứ.'); return; }
    setBusy(true);
    try {
      await createLeave({
        from_date: ymd, days: Number(days),
        reason: REASONS.find(r => r[0] === reason)[1], note: note.trim() || null,
      });
      setDate(''); setNote(''); setDays('1'); setReason('sick');
      await reload();
      Alert.alert('Đã gửi đơn', 'Đơn xin nghỉ đã gửi tới giáo viên chủ nhiệm.');
    } catch (e) { Alert.alert('Gửi đơn thất bại', e.message); }
    finally { setBusy(false); }
  };

  const cancel = l =>
    Alert.alert('Hủy đơn xin nghỉ?', `Đơn nghỉ ngày ${fmtDM(l.from_date)}`, [
      { text: 'Giữ lại', style: 'cancel' },
      { text: 'Hủy đơn', style: 'destructive', onPress: async () => {
        try {
          await cancelLeave(l.id);
          await reload();
        } catch (e) { Alert.alert('Không hủy được', e.message); reload(); }
      } },
    ]);

  const leaves = data || [];
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Xin nghỉ học" sub="Gửi đơn cho giáo viên chủ nhiệm" onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <Field icon="calendar-outline" label="Ngày bắt đầu nghỉ" placeholder="Ngày/tháng, ví dụ 21/11"
          keyboardType="numbers-and-punctuation" value={date} onChangeText={setDate} />
        <View>
          <Text style={L.label}>Số ngày nghỉ</Text>
          <Pills items={DAYS} value={days} onChange={setDays} />
        </View>
        <View>
          <Text style={L.label}>Lý do</Text>
          <Pills items={REASONS} value={reason} onChange={setReason} />
        </View>
        <TextArea label="Ghi chú (không bắt buộc)" placeholder="Mô tả thêm nếu cần" value={note} onChangeText={setNote} />
        <TouchableOpacity style={[L.cta, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.9}>
          <Ionicons name="paper-plane-outline" size={20} color="#fff" />
          <Text style={L.ctaTxt}>{busy ? 'Đang gửi…' : 'Gửi đơn'}</Text>
        </TouchableOpacity>

        <Text style={[s.h2, { marginTop: 4 }]}>Đơn đã gửi</Text>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && leaves.length === 0 && <Text style={s.mut}>Chưa có đơn nào.</Text>}
        <View style={{ gap: 10 }}>
          {leaves.map(l => {
            const st = LEAVE_STATUS[l.status];
            return (
              <View key={l.id} style={[s.card, { gap: 8 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.h2}>Nghỉ từ {fmtDM(l.from_date)} · {l.days} ngày</Text>
                  <Chip label={st.label} color={st.color} bg={st.bg} />
                </View>
                <Text style={s.mut}>Lý do: {l.reason}{l.note ? ` · ${l.note}` : ''}</Text>
                {l.status === 'pending' && (
                  <TouchableOpacity style={[L.mini, { flex: 0 }]} onPress={() => cancel(l)}>
                    <Text style={[L.miniTxt, { color: '#B42318' }]}>Hủy đơn</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
