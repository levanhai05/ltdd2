import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/db';

const KIND_ORDER = ['light', 'fan', 'ac'];

// Khu vực + thiết bị lấy từ bảng areas/devices. Tự cập nhật khi thiết bị đổi (realtime, ví dụ ESP32 gửi lên).
// areas: [{ id, name, dev: { light: bool, fan: bool, ac: bool } }] — chỉ có loại thiết bị mà khu vực đó thực sự có.
export function useDevices() {
  const [areas, setAreas] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const seq = useRef(0);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const id = ++seq.current;
    try {
      const [ar, dv] = await Promise.all([
        supabase.from('areas').select('id, name'),
        supabase.from('devices').select('area_id, kind, is_on'),
      ]);
      const devs = unwrap(dv);
      const list = unwrap(ar).map(a => ({
        id: a.id, name: a.name,
        dev: Object.fromEntries(devs.filter(d => d.area_id === a.id)
          .sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind)).map(d => [d.kind, d.is_on])),
      })).sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
      if (alive.current && id === seq.current) { setAreas(list); setError(null); }
    } catch (e) {
      if (alive.current && id === seq.current) setError(e.message || String(e));
    } finally {
      if (alive.current && id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const ch = supabase.channel(`devices-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        clearTimeout(timer.current);                    // gộp nhiều thay đổi liên tiếp thành 1 lần tải
        timer.current = setTimeout(load, 300);
      })
      .subscribe();
    return () => { alive.current = false; clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [load]);

  // Bật/tắt 1 thiết bị: cập nhật giao diện ngay, lỗi thì tải lại từ DB
  const setDevice = useCallback(async (areaId, kind, on) => {
    setAreas(list => list && list.map(a => (a.id === areaId ? { ...a, dev: { ...a.dev, [kind]: on } } : a)));
    try {
      const rows = unwrap(await supabase.from('devices').update({ is_on: on })
        .eq('area_id', areaId).eq('kind', kind).select('id'));
      if (!rows.length) throw new Error('Bạn không có quyền điều khiển thiết bị này.');
    } catch (e) {
      Alert.alert('Không điều khiển được', e.message);
      load();
    }
  }, [load]);

  // Tắt tất cả thiết bị cùng loại ở mọi khu vực (chỉ chạm vào thiết bị đang bật)
  const turnOffAll = useCallback(async kind => {
    setAreas(list => list && list.map(a => (kind in a.dev ? { ...a, dev: { ...a.dev, [kind]: false } } : a)));
    try {
      unwrap(await supabase.from('devices').update({ is_on: false }).eq('kind', kind).eq('is_on', true));
    } catch (e) {
      Alert.alert('Không tắt được', e.message);
      load();
    }
  }, [load]);

  return { areas, loading, error, reload: load, setDevice, turnOffAll };
}
