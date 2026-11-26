import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { ChatView } from '../../components/ChatView';
import { Header } from '../../components/Header';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import { loadStudent, p2 } from '../../lib/parent';
import { s } from '../../styles';
import { C } from '../../theme';

const hhmm = iso => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const toMsg = (m, uid) => ({ id: m.id, from: m.sender_id === uid ? 'me' : 'other', text: m.body, time: hhmm(m.created_at), at: m.created_at,
  peer: m.sender_id === uid ? m.receiver_id : m.sender_id });

// Danh sách giáo viên của học sinh: GVCN + giáo viên các môn có tiết ở lớp
async function loadContacts(uid) {
  const st = await loadStudent(uid);
  const byId = new Map();
  const rows = unwrap(await supabase.from('lessons')
    .select('teacher_id, subjects(name), profiles:teacher_id(full_name)').eq('class_id', st.class_id));
  rows.forEach(r => {
    const cur = byId.get(r.teacher_id) || { id: r.teacher_id, name: r.profiles?.full_name || 'Giáo viên', subjects: new Set() };
    if (r.subjects?.name) cur.subjects.add(r.subjects.name);
    byId.set(r.teacher_id, cur);
  });
  if (st.classes?.homeroom_id && !byId.has(st.classes.homeroom_id)) {
    const p = unwrap(await supabase.from('profiles').select('id, full_name').eq('id', st.classes.homeroom_id).maybeSingle());
    if (p) byId.set(p.id, { id: p.id, name: p.full_name, subjects: new Set() });
  }
  const list = [...byId.values()].map(t => ({
    id: t.id, name: t.name,
    role: t.id === st.classes?.homeroom_id ? 'Giáo viên chủ nhiệm' : [...t.subjects].join(', ') || 'Giáo viên',
  })).sort((a, b) => (b.id === st.classes?.homeroom_id) - (a.id === st.classes?.homeroom_id) || a.name.localeCompare(b.name, 'vi'));
  const msgs = unwrap(await supabase.from('messages').select('id, sender_id, receiver_id, body, created_at')
    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`).order('created_at', { ascending: true }).limit(500)).map(m => toMsg(m, uid));
  return { student: st, teachers: list, msgs };
}

export function ParentContact({ profile }) {
  const uid = profile.id;
  const { data, loading, error, reload } = useAsync(() => loadContacts(uid), [uid]);
  const [extra, setExtra] = useState([]);              // tin mới nhận qua realtime / vừa gửi
  const [openId, setOpenId] = useState(null);
  const close = useCallback(() => setOpenId(null), []);
  useHardwareBack(openId !== null, close);

  // Tin mới tới (realtime) — RLS chỉ gửi tin của chính mình
  useEffect(() => {
    const ch = supabase.channel(`msg-${uid}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` },
        p => setExtra(list => (list.some(m => m.id === p.new.id) ? list : [...list, toMsg(p.new, uid)])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  const all = [...(data?.msgs || []), ...extra.filter(m => !(data?.msgs || []).some(x => x.id === m.id))];
  const thread = id => all.filter(m => m.peer === id).sort((a, b) => a.at.localeCompare(b.at));

  const send = async (id, text) => {
    try {
      const row = unwrap(await supabase.from('messages').insert({ sender_id: uid, receiver_id: id, body: text }).select().single());
      setExtra(list => [...list, toMsg(row, uid)]);
    } catch (e) { Alert.alert('Gửi thất bại', e.message); }
  };

  if (openId !== null && data) {
    const t = data.teachers.find(x => x.id === openId);
    return <ChatView title={t.name} sub={t.role} messages={thread(openId)} onBack={close} onSend={text => send(openId, text)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Liên hệ giáo viên" sub={data ? `Giáo viên của em ${data.student.full_name}` : ' '} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => { setExtra([]); reload(); }} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && data.teachers.length === 0 && <Text style={s.mut}>Lớp chưa có giáo viên nào được phân công.</Text>}
        {data && data.teachers.map(t => {
          const msgs = thread(t.id);
          const last = msgs[msgs.length - 1];
          return (
            <TouchableOpacity key={t.id} activeOpacity={0.8} onPress={() => setOpenId(t.id)}
              style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Avatar />
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{t.name}</Text>
                <Text style={s.mut}>{t.role}</Text>
                {last && <Text style={[s.mut, { marginTop: 2 }]} numberOfLines={1}>{last.from === 'me' ? 'Bạn: ' : ''}{last.text}</Text>}
              </View>
              <View accessibilityLabel="Nhắn tin" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={C.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
