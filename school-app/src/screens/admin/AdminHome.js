import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Hero } from '../../components/Hero';
import { Body, Over } from '../../components/Layout';
import { BadgeTiles } from '../../components/BadgeTiles';
import { AnnounceScreen } from '../../components/AnnounceScreen';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { useAsync } from '../../hooks/useAsync';
import { ROLE_NAME } from '../../data/mock';
import { supabase } from '../../lib/supabase';
import { unwrap, summarize, fmtWhen, AUDIENCE } from '../../lib/db';
import { AdminStats } from './AdminStats';
import { AdminLogs } from './AdminLogs';
import { s } from '../../styles';
import { C } from '../../theme';

// Thông báo toàn trường: tải danh sách đã gửi từ bảng notices, gửi qua RPC admin_send_notice
function AdminAnnounce({ onBack }) {
  const [sent, setSent] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const rows = unwrap(await supabase.from('notices')
          .select('id, title, body, audience, created_at').eq('author_id', session.user.id)
          .order('created_at', { ascending: false }).limit(30));
        if (alive) setSent(rows.map(n => ({ id: n.id, to: AUDIENCE[n.audience] || 'Toàn trường', title: n.title, content: n.body, when: fmtWhen(n.created_at) })));
      } catch (e) {
        Alert.alert('Không tải được thông báo đã gửi', e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSend = async item => {
    try {
      const row = unwrap(await supabase.rpc('admin_send_notice', { p_audience: item.target, p_title: item.title, p_body: item.content }));
      setSent(list => [{ id: row.id, to: item.to, title: item.title, content: item.content, when: fmtWhen(row.created_at) }, ...list]);
      return true;
    } catch (e) {
      Alert.alert('Gửi thất bại', e.message);
      return false;
    }
  };

  return (
    <AnnounceScreen title="Thông báo toàn trường" sub="Gửi tới người dùng trong hệ thống" onBack={onBack} sent={sent}
      targets={[['all', 'Toàn trường'], ['hs', 'Học sinh'], ['ph', 'Phụ huynh'], ['gv', 'Giáo viên'], ['bv', 'Bảo vệ']]}
      onSend={onSend} />
  );
}

export function AdminHome({ onLogout, go }) {
  const [view, setView] = useState('home');
  const { data, loading, error, reload } = useAsync(async () => {
    const [sum, recent] = await Promise.all([
      supabase.rpc('admin_account_summary'),
      supabase.from('profiles').select('id, username, full_name, role').neq('role', 'admin')
        .order('created_at', { ascending: false }).limit(3),
    ]);
    return { acc: summarize(unwrap(sum)), recent: unwrap(recent) };
  });
  const back = useCallback(() => { setView('home'); reload(); }, [reload]);
  useHardwareBack(view !== 'home', back);

  if (view === 'stats') return <AdminStats onBack={back} />;
  if (view === 'logs') return <AdminLogs onBack={back} />;
  if (view === 'announce') return <AdminAnnounce onBack={back} />;

  const acc = data?.acc;
  return (
    <Body>
      <Hero name="Quản trị viên" sub="Quản lý tài khoản hệ thống" onLogout={onLogout} />
      <Over>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {['parent', 'teacher', 'guard'].map(r => (
            <View key={r} style={[s.card, { flex: 1 }]}>
              <Text style={s.mut}>{ROLE_NAME[r]}</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: C.primary }}>{acc ? acc.byRole[r] || 0 : '–'}</Text>
            </View>
          ))}
        </View>
        <BadgeTiles items={[
          ['person-add-outline', 'Cấp tài khoản', C.soft, () => go(2)],
          ['people-outline', 'Danh sách tài khoản', C.warm, () => go(1)],
          ['megaphone-outline', 'Thông báo toàn trường', C.soft, () => setView('announce')],
          ['stats-chart-outline', 'Thống kê', C.warm, () => setView('stats')],
          ['time-outline', 'Nhật ký hoạt động', C.soft, () => setView('logs')],
          ['lock-closed-outline', 'Tài khoản bị khóa', C.warm, () => go(1), acc ? acc.locked : 0],
        ]} />
        <View style={[s.card, { gap: 10 }]}>
          <Text style={s.h2}>Cấp gần đây</Text>
          {data && data.recent.length === 0 && <Text style={s.mut}>Chưa có tài khoản nào.</Text>}
          {(data?.recent || []).map(a => (
            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontSize: 13 }}>{a.full_name}</Text>
              <Text style={s.mut}>{ROLE_NAME[a.role]} · {a.username}</Text>
            </View>
          ))}
        </View>
      </Over>
    </Body>
  );
}
