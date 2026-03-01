import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';

/**
 * IndexedDB hideoutProgressテーブルからリアルタイム更新されるSet<levelId>。
 * Dexieテーブルの変更時に再読み込みする。
 */
export function useHideoutProgressMap() {
  const [builtLevelIds, setBuiltLevelIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await db.hideoutProgress.toArray();
    const set = new Set<string>();
    for (const r of rows) {
      set.add(r.levelId);
    }
    setBuiltLevelIds(set);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const handler = () => { setTimeout(refresh, 0); };
    db.hideoutProgress.hook('creating', handler);
    db.hideoutProgress.hook('updating', handler);
    db.hideoutProgress.hook('deleting', handler);

    return () => {
      db.hideoutProgress.hook('creating').unsubscribe(handler);
      db.hideoutProgress.hook('updating').unsubscribe(handler);
      db.hideoutProgress.hook('deleting').unsubscribe(handler);
    };
  }, [refresh]);

  return { builtLevelIds, loading, refresh };
}
