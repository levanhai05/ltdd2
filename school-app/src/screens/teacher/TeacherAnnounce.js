import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { AnnounceScreen } from '../../components/AnnounceScreen';
import { BackHeader } from '../../components/BackHeader';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap, fmtWhen } from '../../lib/db';
import { loadTeaching, classOptions } from '../../lib/teacher';
import { s } from '../../styles';

function Form({ classes, initial, onBack }) {
  const [sent, setSent] = useState(initial);
  const onSend = async item => {
    try {
      const row = unwrap(await supabase.rpc('teacher_send_notice', { p_class_id: item.target, p_title: item.title, p_body: item.content }));
      setSent(list => [{ id: row.id, to: item.to, title: item.title, content: item.content, when: fmtWhen(row.created_at) }, ...list]);
      return true;
    } catch (e) {
      Alert.alert('Gửi thất bại', e.message);
      return false;
    }
  };
  return (
    <AnnounceScreen title="Thông báo lớp" sub="Gửi tới học sinh và phụ huynh của lớp" onBack={onBack}
      targets={classes} sent={sent} onSend={onSend} />
  );
}

// Thông báo của giáo viên: gửi qua RPC teacher_send_notice (xem supabase/teacher_notices.sql)
export function TeacherAnnounce({ profile, onBack }) {
  const { data, loading, error, reload } = useAsync(async () => {
    const t = await loadTeaching(profile.id);
    const rows = unwrap(await supabase.from('notices').select('id, title, body, created_at, classes(name)')
      .eq('author_id', profile.id).eq('tag', 'cls').order('created_at', { ascending: false }).limit(30));
    return {
      classes: classOptions(t).map(([id, name]) => [id, `Lớp ${name}`]),
      sent: rows.map(n => ({ id: n.id, to: n.classes?.name ? `Lớp ${n.classes.name}` : 'Lớp', title: n.title, content: n.body, when: fmtWhen(n.created_at) })),
    };
  }, [profile.id]);

  if (data && data.classes.length > 0) return <Form classes={data.classes} initial={data.sent} onBack={onBack} />;
  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Thông báo lớp" sub="Gửi tới học sinh và phụ huynh của lớp" onBack={onBack} />
      <View style={{ padding: 16, gap: 12 }}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && <Text style={s.mut}>Bạn chưa được phân công lớp nào nên chưa gửi thông báo được.</Text>}
      </View>
    </View>
  );
}
