import React from 'react';
import { View, Text } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { NoticeScreen } from '../../components/NoticeScreen';
import { Loading, ErrorBox } from '../../components/AsyncStates';
import { useAsync } from '../../hooks/useAsync';
import { loadNotices, markNoticesRead } from '../../lib/parent';
import { s } from '../../styles';

// Thông báo thật từ bảng notices; đọc rồi thì ghi vào notice_reads
export function ParentNotices({ profile, student, onBack }) {
  const { data, loading, error, reload } = useAsync(() => loadNotices(profile.id, student), [profile.id, student.id]);
  const [local, setLocal] = React.useState(null);
  const notices = local || data;

  const setNotices = next => {
    const prev = notices || [];
    const newlyRead = next.filter(n => n.read && !prev.find(p => p.id === n.id)?.read).map(n => n.id);
    setLocal(next);
    markNoticesRead(profile.id, newlyRead).catch(() => reload());
  };

  if (!notices)
    return (
      <View style={{ flex: 1 }}>
        <BackHeader title="Thông báo từ nhà trường" onBack={onBack} />
        <View style={{ padding: 16 }}>{error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Loading /> : null}</View>
      </View>
    );
  if (notices.length === 0)
    return (
      <View style={{ flex: 1 }}>
        <BackHeader title="Thông báo từ nhà trường" sub="Chưa có thông báo nào" onBack={onBack} />
        <Text style={[s.mut, { padding: 16 }]}>Hiện chưa có thông báo nào.</Text>
      </View>
    );
  return <NoticeScreen title="Thông báo từ nhà trường" notices={notices} setNotices={setNotices} onBack={onBack} />;
}
