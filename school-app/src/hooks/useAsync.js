import { useCallback, useEffect, useRef, useState } from 'react';

// Chạy hàm async khi mount và mỗi khi deps đổi. Trả về { data, loading, error, reload }.
// Khi reload, dữ liệu cũ được giữ lại để không bị nháy trắng màn hình.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (alive.current && id === seq.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (alive.current && id === seq.current) setState(s => ({ ...s, loading: false, error: e.message || String(e) }));
    }
  }, []);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  return { ...state, reload };
}
