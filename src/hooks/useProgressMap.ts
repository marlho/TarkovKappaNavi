import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import type { TaskStatus } from '../db/types';

/**
 * IndexedDBからリアルタイム更新されるMap<taskId, TaskStatus>。
 * Dexieテーブルの変更時に再読み込みする。
 */
export function useProgressMap() {
  const [progressMap, setProgressMap] = useState<Map<string, TaskStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await db.progress.toArray();
    const map = new Map<string, TaskStatus>();
    for (const r of rows) {
      map.set(r.taskId, r.status);
    }
    setProgressMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // progressテーブルの変更時に再読み込み。
    // setTimeoutでDexieトランザクションのコミット後に読み込みを実行する。
    const handler = () => { setTimeout(refresh, 0); };
    db.progress.hook('creating', handler);
    db.progress.hook('updating', handler);
    db.progress.hook('deleting', handler);

    return () => {
      db.progress.hook('creating').unsubscribe(handler);
      db.progress.hook('updating').unsubscribe(handler);
      db.progress.hook('deleting').unsubscribe(handler);
    };
  }, [refresh]);

  return { progressMap, loading, refresh };
}
