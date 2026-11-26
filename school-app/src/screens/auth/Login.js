import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../components/Field';
import { s, L } from '../../styles';
import { C, TOP } from '../../theme';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';

export function Login({ onLogin, onForgot }) {
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  // Lấy profile (role, active) của phiên đang có từ backend rồi vào app
  const enter = async () => {
    let prof;
    try {
      prof = await api('/auth/me');
    } catch (e) {
      // Token không còn hợp lệ hoặc tài khoản bị khóa -> bỏ phiên; lỗi mạng thì giữ phiên để thử lại
      if (e.status === 401 || e.status === 403) await supabase.auth.signOut();
      throw e;
    }
    onLogin(prof.role, prof);
  };

  const doLogin = async () => {
    const u = user.trim().toLowerCase();
    if (!u || !pass) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập tài khoản và mật khẩu.'); return; }
    setLoading(true);
    try {
      // Backend tự ghép đuôi @school.local, nên chỉ gửi tên tài khoản (vd gv001)
      const username = u.endsWith('@school.local') ? u.slice(0, -'@school.local'.length) : u;
      if (username.includes('@')) throw new Error('Hãy nhập tên tài khoản (ví dụ gv001), không nhập email.');
      const { session, profile } = await api('/auth/login', { method: 'POST', body: { username, password: pass } });
      // Đưa phiên vào Supabase client để app tự làm mới token và dùng realtime
      const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
      if (error) throw new Error(error.message);
      onLogin(profile.role, profile);
    } catch (e) {
      Alert.alert('Đăng nhập thất bại', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        Alert.alert('Không khả dụng', 'Thiết bị chưa hỗ trợ hoặc chưa cài đặt vân tay/khuôn mặt. Vui lòng đăng nhập bằng mật khẩu.');
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để đăng nhập',
        cancelLabel: 'Hủy',
        fallbackLabel: 'Dùng mật khẩu',
      });
      if (res.success) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert('Chưa có phiên đăng nhập', 'Hãy đăng nhập bằng mật khẩu ít nhất một lần trước khi dùng vân tay.');
          return;
        }
        setLoading(true);
        try { await enter(); } finally { setLoading(false); }
      }
      else if (res.error !== 'user_cancel' && res.error !== 'system_cancel' && res.error !== 'app_cancel')
        Alert.alert('Xác thực thất bại', 'Vui lòng thử lại hoặc đăng nhập bằng mật khẩu.');
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể xác thực sinh trắc học trên thiết bị này.');
    }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[L.hero, { paddingTop: TOP + 28 }]}>
          <View style={[L.blob, { width: 220, height: 220, top: -70, right: -60 }]} />
          <View style={[L.blob, { width: 140, height: 140, bottom: 30, left: -50 }]} />
          <View style={L.logo}><Ionicons name="school" size={36} color={C.primary} /></View>
          <Text style={L.brand}>TRƯỜNG HỌC THÔNG MINH</Text>
          <Text style={L.tag}>Hệ thống trường học thông minh</Text>
        </View>

        <View style={L.card}>
          <Text style={L.title}>Chào mừng trở lại</Text>
          <Text style={[s.mut, { fontSize: 13, marginTop: 2 }]}>Đăng nhập để tiếp tục</Text>

          <View style={{ gap: 16 }}>
            <Field icon="person-outline" label="Tài khoản hoặc email"
              placeholder="[Nhập tài khoản]" autoCapitalize="none" value={user} onChangeText={setUser} />
            <Field icon="lock-closed-outline" label="Mật khẩu" placeholder="[Nhập mật khẩu]"
              secureTextEntry={!show} autoCapitalize="none" value={pass} onChangeText={setPass}
              right={
                <TouchableOpacity onPress={() => setShow(!show)} accessibilityLabel="Hiện mật khẩu"
                  style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
                </TouchableOpacity>
              } />
          </View>

          <View style={L.rowBetween}>
            <TouchableOpacity style={L.remember} onPress={() => setRemember(!remember)} activeOpacity={0.8}>
              <View style={[L.check, remember && { backgroundColor: C.primary, borderColor: C.primary }]}>
                {remember && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ fontSize: 13, color: C.text }}>Ghi nhớ đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ minHeight: 44, justifyContent: 'center' }} onPress={onForgot}>
              <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[L.cta, { flex: 1, opacity: loading ? 0.6 : 1 }]} onPress={doLogin} disabled={loading} activeOpacity={0.9}>
              <Text style={L.ctaTxt}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={L.bio} onPress={onBiometric} disabled={loading} activeOpacity={0.8} accessibilityLabel="Đăng nhập bằng vân tay">
              <Ionicons name="finger-print" size={28} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.mut, { textAlign: 'center', marginTop: 20 }]}>
          Cần hỗ trợ? Liên hệ [Phòng CNTT nhà trường]
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}