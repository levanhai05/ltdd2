import { useEffect } from 'react';
import { BackHandler } from 'react-native';

// Khi active = true, nút Back của Android gọi onBack thay vì thoát app
export function useHardwareBack(active, onBack) {
  useEffect(() => {
    if (!active) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [active, onBack]);
}