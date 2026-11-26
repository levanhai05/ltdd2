import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Header } from '../../components/Header';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { ROLE_NAME } from '../../data/mock';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import { s, L } from '../../styles';
import { C } from '../../theme';

const LIMIT = 300;

export function AdminAccounts() {
  const [f, setF] = useState('all');
  const [busy, setBusy] = useState(null);
  const { data: list, loading, error, reload } = useAsync(async () => {
    let q = supabase.from('profiles').select('id, username, full_name, role, active')
      .neq('role', 'admin').order('username').limit(LIMIT);
    if (f !== 'all') q = q.eq('role', f);
    return unwrap(await q);
  }, [f]);

  // Chạy 1 thao tác trên tài khoản a, khóa nút trong lúc chờ, xong thì tải lại danh sách
  const run = async (a, job) => {
    setBusy(a.id);
    try { await job(); await reload(); }
    catch (e) { Alert.alert('Không thực hiện được', e.message); }
    finally { setBusy(null); }
  };

  const setActive = (a, active) => run(a, async () => unwrap(await supabase.rpc('admin_set_active', { p_user: a.id, p_active: active })));

  const toggle = a => {
    if (!a.active) return setActive(a, true);
    Alert.alert('Khóa tài khoản', `Khóa ${a.username}? Người này sẽ bị đăng xuất và không đăng nhập lại được.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Khóa', style: 'destructive', onPress: () => setActive(a, false) },
    ]);
  };

  const resetPw = a => Alert.alert('Cấp lại mật khẩu', `Đặt mật khẩu tạm mới cho ${a.username}? Mật khẩu cũ sẽ không dùng được nữa.`, [
    { text: 'Hủy', style: 'cancel' },
    {
      text: 'Cấp lại',
      onPress: () => run(a, async () => {
        const pw = unwrap(await supabase.rpc('admin_reset_password', { p_user: a.id }));
        Alert.alert('Mật khẩu tạm mới', `Tài khoản: ${a.username}\nMật khẩu: ${pw}`);
      }),
    },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Tài khoản" sub="Phụ huynh, giáo viên và bảo vệ" />
      <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
        {[['all', 'Tất cả'], ['parent', 'HS / PH'], ['teacher', 'Giáo viên'], ['guard', 'Bảo vệ']].map(([k, t]) => (
          <TouchableOpacity key={k} onPress={() => setF(k)}
            style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: f === k ? C.primary : '#fff', borderWidth: 1, borderColor: f === k ? C.primary : C.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: f === k ? '#fff' : C.text }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading && !!list} onRefresh={reload} />}>
        {loading && !list && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {list && list.length === 0 && <Text style={s.mut}>Chưa có tài khoản nào.</Text>}
        {(list || []).map(a => (
          <View key={a.id} style={[s.card, { gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar ic={{ parent: 'people', teacher: 'person', guard: 'shield-checkmark' }[a.role]} />
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{a.full_name}</Text>
                <Text style={s.mut}>{ROLE_NAME[a.role]} · {a.username}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: a.active ? '#157347' : '#B42318' }}>{a.active ? 'Hoạt động' : 'Đã khóa'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, opacity: busy === a.id ? 0.5 : 1 }}>
              <TouchableOpacity style={L.mini} disabled={busy === a.id} onPress={() => resetPw(a)}>
                <Text style={L.miniTxt}>Cấp lại mật khẩu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={L.mini} disabled={busy === a.id} onPress={() => toggle(a)}>
                <Text style={[L.miniTxt, !a.active && { color: '#157347' }]}>{a.active ? 'Khóa' : 'Mở khóa'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {list && list.length >= LIMIT && <Text style={s.mut}>Chỉ hiển thị {LIMIT} tài khoản đầu tiên — hãy lọc theo vai trò.</Text>}
      </ScrollView>
    </View>
  );
}
