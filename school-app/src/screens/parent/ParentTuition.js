import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap } from '../../lib/db';
import { loadFees, fmtVND, fmtDM, daysLeft } from '../../lib/parent';
import { s, L } from '../../styles';
import { C } from '../../theme';

export function ParentTuition({ student, onBack }) {
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => loadFees(student.id), [student.id]);
  const fees = data || [];
  const due = fees.filter(f => !f.paid);
  const paid = fees.filter(f => f.paid);
  const total = due.reduce((a, f) => a + Number(f.amount), 0);

  const pay = async ids => {
    setBusy(true);
    try {
      unwrap(await supabase.rpc('parent_pay_fees', { p_ids: ids }));
      await reload();
    } catch (e) { Alert.alert('Thanh toán thất bại', e.message); }
    finally { setBusy(false); }
  };
  const confirm = (ids, label, amount) =>
    Alert.alert('Xác nhận thanh toán', `${label}\nSố tiền: ${fmtVND(amount)}`, [
      { text: 'Hủy', style: 'cancel' }, { text: 'Thanh toán', onPress: () => pay(ids) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Học phí" sub={`Các khoản phí của ${student.full_name}`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <>
            <View style={[s.card, { backgroundColor: C.soft, borderColor: '#C7D7F7', gap: 4 }]}>
              <Text style={[s.mut, { color: '#1E3A8A' }]}>Cần thanh toán</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: C.primary }}>{fmtVND(total)}</Text>
              <Text style={[s.mut, { color: '#1E3A8A' }]}>{due.length ? `${due.length} khoản chưa thanh toán` : 'Đã thanh toán đầy đủ'}</Text>
            </View>
            {due.length > 1 && (
              <TouchableOpacity style={[L.cta, busy && { opacity: 0.6 }]} disabled={busy} activeOpacity={0.9}
                onPress={() => confirm(due.map(f => f.id), `Thanh toán ${due.length} khoản`, total)}>
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={L.ctaTxt}>Thanh toán tất cả</Text>
              </TouchableOpacity>
            )}
            {due.length > 0 && <Text style={[s.h2, { marginTop: 4 }]}>Chưa thanh toán</Text>}
            {due.map(f => (
              <View key={f.id} style={[s.card, { gap: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[s.h2, { flex: 1 }]}>{f.title}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: C.primary }}>{fmtVND(f.amount)}</Text>
                </View>
                <Text style={[s.mut, daysLeft(f.due_date) < 0 && { color: '#B42318', fontWeight: '600' }]}>
                  Hạn đóng {fmtDM(f.due_date)}{daysLeft(f.due_date) < 0 ? ' · Đã quá hạn' : ''}
                </Text>
                <TouchableOpacity style={[L.mini, { flex: 0, opacity: busy ? 0.5 : 1 }]} disabled={busy} onPress={() => confirm([f.id], f.title, f.amount)} activeOpacity={0.8}>
                  <Text style={L.miniTxt}>Thanh toán</Text>
                </TouchableOpacity>
              </View>
            ))}
            {paid.length > 0 && <Text style={[s.h2, { marginTop: 4 }]}>Đã thanh toán</Text>}
            {paid.map(f => (
              <View key={f.id} style={[s.card, { gap: 8 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[s.h2, { flex: 1 }]}>{f.title}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>{fmtVND(f.amount)}</Text>
                </View>
                <Chip label={`Đã thanh toán${f.paid_at ? ` · ${fmtDM(f.paid_at)}` : ''}`} color="#157347" bg="#E8F7EE" />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
