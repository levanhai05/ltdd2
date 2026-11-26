import { Platform, StatusBar } from 'react-native';

export const C = {
  primary: '#1D4ED8', bg: '#F4F7FB', card: '#FFFFFF', border: '#E3E8F0',
  text: '#0F172A', muted: '#5B6475', soft: '#E4ECFD', warm: '#FDEBD8',
};

export const TOP = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 48;
