import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/theme';
import { s } from './src/styles';
import { getTabs } from './src/navigation/roleTabs';
import { supabase } from './src/lib/supabase';
import { Login } from './src/screens/auth/Login';
import { ForgotPassword } from './src/screens/auth/ForgotPassword';

export default function App() {
  const [logged, setLogged] = useState(false);
  const [role, setRole] = useState('parent');
  const [tab, setTab] = useState(0);
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(null);
  const logout = async () => { await supabase.auth.signOut(); setProfile(null); setLogged(false); };

  if (!logged && screen === 'forgot') return (<><StatusBar barStyle="dark-content" /><ForgotPassword onBack={() => setScreen('login')} /></>);
  if (!logged) return (<><StatusBar barStyle="light-content" /><Login onLogin={(r, p) => { setRole(r); setProfile(p); setTab(0); setLogged(true); }} onForgot={() => setScreen('forgot')} /></>);

  const tabs = getTabs(role, { logout, go: setTab, profile });
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={tab === 0 ? 'light-content' : 'dark-content'} />
      <View style={{ flex: 1 }}>{tabs[tab][2]}</View>
      <View style={s.tabBar}>
        {tabs.map(([ic, t], i) => (
          <TouchableOpacity key={t} style={s.tab} onPress={() => setTab(i)}>
            <Ionicons name={ic} size={22} color={tab === i ? C.primary : C.muted} />
            <Text style={{ fontSize: 11, fontWeight: tab === i ? '700' : '500', color: tab === i ? C.primary : C.muted }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}