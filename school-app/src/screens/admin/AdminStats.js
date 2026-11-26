import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { ROLE_NAME } from '../../data/mock';
import { useAsync } from '../../hooks/useAsync';
import { supabase } from '../../lib/supabase';
import { unwrap, summarize, fmtDay } from '../../lib/db';
import { s } from '../../styles';
import { C } from '../../theme';

export function AdminStats({ onBack }) {
  const { data, loading, error, reload } = useAsync(async () => {
    const [acc, att] = await Promise.all([supabase.rpc('admin_account_summary'), supabase.rpc('admin_attendance_by_class')]);
    return { acc: summarize(unwrap(acc)), att: unwrap(att) };
  });

  const acc = data?.acc;
  const att = (data?.att || []).map(r => ({ cls: r.class_name, total: Number(r.total), ok: Number(r.attended) }));
  const sumTotal = att.reduce((a, r) => a + r.total, 0);
  const avg = sumTotal ? Math.round((att.reduce((a, r) => a + r.ok, 0) / sumTotal) * 100) : 0;
  const pct = r => (r.total ? Math.round((r.ok / r.total) * 100) : 0);

  return (
    <View style={{ flex: 1 }}>
      <BackHeader title="Thống kê" sub="Tài khoản và chuyên cần" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {acc && (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[['Tổng', acc.total, C.primary], ['Hoạt động', acc.active, '#157347'], ['Đã khóa', acc.locked, '#B42318']].map(([t, v, c]) => (
                <View key={t} style={[s.card, { flex: 1, alignItems: 'center', gap: 2 }]}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: c }}>{v}</Text>
                  <Text style={s.mut}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={[s.card, { gap: 14 }]}>
              <Text style={s.h2}>Tài khoản theo vai trò</Text>
              {['parent', 'teacher', 'guard'].map(r => {
                const n = acc.byRole[r] || 0;
                return (
                  <View key={r}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: C.text }}>{ROLE_NAME[r]}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>{n}</Text>
                    </View>
                    <View style={s.bar}><View style={[s.barFill, { width: `${acc.total ? (n / acc.total) * 100 : 0}%` }]} /></View>
                  </View>
                );
              })}
            </View>

            <View style={[s.card, { gap: 14 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.h2}>Chuyên cần{data.att[0] ? ` ngày ${fmtDay(data.att[0].att_day)}` : ''}</Text>
                {att.length > 0 && <Text style={{ fontWeight: '700', fontSize: 16, color: C.primary }}>TB {avg}%</Text>}
              </View>
              {att.length === 0 && <Text style={s.mut}>Chưa có dữ liệu điểm danh.</Text>}
              {att.map(r => (
                <View key={r.cls}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: C.text }}>Lớp {r.cls} <Text style={s.mut}>({r.ok}/{r.total})</Text></Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: pct(r) >= 95 ? '#157347' : '#B54708' }}>{pct(r)}%</Text>
                  </View>
                  <View style={s.bar}><View style={[s.barFill, { width: `${pct(r)}%`, backgroundColor: pct(r) >= 95 ? '#157347' : '#E8A33D' }]} /></View>
                </View>
              ))}
              {att.length > 0 && <Text style={s.mut}>Tính cả học sinh đi muộn là có mặt.</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
