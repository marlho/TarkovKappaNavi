import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useT } from '../../i18n';

export function CacheControl() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const t = useT();

  const tasksQuery = queryClient.getQueryState(['tasks']);
  const lastUpdated = tasksQuery?.dataUpdatedAt
    ? new Date(tasksQuery.dataUpdatedAt).toLocaleString()
    : t.cache_not_fetched;

  const handleRefresh = async () => {
    setRefreshing(true);
    setMsg('');
    try {
      await queryClient.invalidateQueries();
      setMsg(t.cache_updated);
    } catch {
      setMsg(t.cache_update_failed);
    }
    setRefreshing(false);
  };

  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
        {t.cache_last_fetched.replace('{time}', lastUpdated)}
      </div>
      <button onClick={handleRefresh} disabled={refreshing}>
        {refreshing ? t.cache_updating : t.cache_update_btn}
      </button>
      {msg && (
        <span style={{ fontSize: '0.75rem', color: 'var(--status-done)', marginLeft: 8 }}>
          {msg}
        </span>
      )}
    </div>
  );
}
