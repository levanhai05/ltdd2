import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../components/Field';
import { s, L } from '../../styles';
import { C, TOP } from '../../theme';

export function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [otp, setOtp] = useState('');
  const titles = [
    ['Quên mật khẩu?', 'Nhập email hoặc số điện thoại đã đăng ký, chúng tôi sẽ gửi mã xác nhận cho bạn.'],
    ['Nhập mã xác nhận', 'Mã gồm 6 số đã được gửi đến [email/số điện thoại của bạn].'],
    ['Đặt mật khẩu mới', 'Mật khẩu mới nên có ít nhất 8 ký tự.'],
  ];
  const eye = (
    <TouchableOpacity onPress={() => setShow(!show)} accessibilityLabel="Hiện mật khẩu"
      style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
    </TouchableOpacity>
  );
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: TOP + 8, flexGrow: 1 }}>
        {step < 3 && (
          <TouchableOpacity onPress={step === 0 ? onBack : () => setStep(step - 1)} style={L.back} accessibilityLabel="Quay lại">
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <View style={[L.card, { marginHorizontal: 0, marginTop: 16 }]}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[L.stepBar, i <= step && { backgroundColor: C.primary }]} />
              ))}
            </View>
            <View style={L.iconCircle}>
              <Ionicons name={['mail-outline', 'keypad-outline', 'lock-closed-outline'][step]} size={28} color={C.primary} />
            </View>
            <View>
              <Text style={L.title}>{titles[step][0]}</Text>
              <Text style={[s.mut, { fontSize: 13, marginTop: 6, lineHeight: 19 }]}>{titles[step][1]}</Text>
            </View>

            {step === 0 && (
              <Field icon="mail-outline" label="Email hoặc số điện thoại"
                placeholder="[Nhập email / SĐT]" autoCapitalize="none" />
            )}
            {step === 1 && (
              <View style={{ gap: 6 }}>
                <TextInput style={L.otp} value={otp} onChangeText={t => setOtp(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad" maxLength={6} placeholder="------" placeholderTextColor="#B6BFCD" />
                <TouchableOpacity style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Gửi lại mã</Text>
                </TouchableOpacity>
              </View>
            )}
            {step === 2 && (
              <View style={{ gap: 14 }}>
                <Field icon="lock-closed-outline" label="Mật khẩu mới" placeholder="[Nhập mật khẩu mới]" secureTextEntry={!show} right={eye} />
                <Field icon="lock-closed-outline" label="Nhập lại mật khẩu" placeholder="[Nhập lại mật khẩu]" secureTextEntry={!show} />
              </View>
            )}

            <TouchableOpacity style={L.cta} onPress={() => setStep(step + 1)} activeOpacity={0.9}>
              <Text style={L.ctaTxt}>{['Gửi mã xác nhận', 'Xác nhận', 'Đặt lại mật khẩu'][step]}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 12 }}>
            <View style={[L.iconCircle, { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E8F7EE' }]}>
              <Ionicons name="checkmark-circle" size={52} color="#157347" />
            </View>
            <Text style={L.title}>Đổi mật khẩu thành công</Text>
            <Text style={[s.mut, { fontSize: 13, textAlign: 'center' }]}>Bạn có thể đăng nhập bằng mật khẩu mới.</Text>
            <TouchableOpacity style={[L.cta, { alignSelf: 'stretch', marginTop: 10 }]} onPress={onBack} activeOpacity={0.9}>
              <Text style={L.ctaTxt}>Về đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
