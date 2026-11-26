import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ROLE_NAME } from '../../data/mock';
import { api } from '../../lib/api';
import { L } from '../../styles';
import { C } from '../../theme';

export function AdminCreate({ go }) {
  const [role, setRole] = useState('parent');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
    if (!name.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên.'); return; }
    setLoading(true);
    try {
      // Tên đăng nhập + mật khẩu tạm do server sinh, trả về để admin gửi cho người dùng
      const r = await api('/admin/users', {
        method: 'POST',
        body: {
          role,
          full_name: name.trim(),
          phone: phone.trim() || null,
          student_code: role === 'parent' ? code.trim() || null : null,
        },
      });
      Alert.alert('Đã cấp tài khoản', `Tài khoản: ${r.username}\nMật khẩu tạm: ${r.password}\n\nHãy gửi thông tin này cho người dùng.`);
      setName(''); setPhone(''); setCode('');
      go(1);
    } catch (e) {
      Alert.alert('Không cấp được tài khoản', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Cấp tài khoản" sub="Tạo tài khoản phụ huynh, giáo viên hoặc bảo vệ" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#EEF2F8', borderRadius: 12, padding: 4 }}>
          {['parent', 'teacher', 'guard'].map(r => (
            <TouchableOpacity key={r} onPress={() => setRole(r)}
              style={{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: role === r ? '#fff' : 'transparent' }}>
              <Text style={{ fontSize: 14, fontWeight: role === r ? '700' : '500', color: role === r ? C.primary : C.muted }}>{ROLE_NAME[r]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field icon="person-outline" label="Họ và tên" placeholder="[Nhập họ tên]" value={name} onChangeText={setName} />
        <Field icon="call-outline" label="Số điện thoại" placeholder="[Nhập SĐT]" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {role === 'parent' && (
          <Field icon="school-outline" label="Mã học sinh liên kết (không bắt buộc)" placeholder="[Ví dụ: HS001]" autoCapitalize="characters" value={code} onChangeText={setCode} />
        )}
        <TouchableOpacity style={[L.cta, loading && { opacity: 0.7 }]} onPress={submit} activeOpacity={0.9} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="person-add-outline" size={20} color="#fff" />}
          <Text style={L.ctaTxt}>{loading ? 'Đang tạo...' : 'Cấp tài khoản'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
