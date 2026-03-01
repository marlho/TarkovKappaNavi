import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';

/**
 * IndexedDB hideoutLevelInventoryテーブルからリアルタイム更新されるインベントリ。
 * レベル別および全レベル合計の所持数を提供する。
 */
export function useHideoutItemInventory() {
  // Map<"levelId\0itemId", ownedCount>
  const [inventoryMap, setInventoryMap] = useState<Map<string, number>>(new Map());

  const refresh = useCallback(async () => {
    const rows = await db.hideoutLevelInventory.toArray();
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(`${r.levelId}\0${r.itemId}`, r.ownedCount);
    }
    setInventoryMap(map);
  }, []);

  useEffect(() => {
    refresh();

    const handler = () => { setTimeout(refresh, 0); };
    db.hideoutLevelInventory.hook('creating', handler);
    db.hideoutLevelInventory.hook('updating', handler);
    db.hideoutLevelInventory.hook('deleting', handler);

    return () => {
      db.hideoutLevelInventory.hook('creating').unsubscribe(handler);
      db.hideoutLevelInventory.hook('updating').unsubscribe(handler);
      db.hideoutLevelInventory.hook('deleting').unsubscribe(handler);
    };
  }, [refresh]);

  /** 特定レベルの所持数 */
  const getLevelOwnedCount = useCallback(
    (levelId: string, itemId: string): number => {
      return inventoryMap.get(`${levelId}\0${itemId}`) ?? 0;
    },
    [inventoryMap],
  );

  /** 全レベル合計の所持数 */
  const getItemTotalOwned = useCallback(
    (itemId: string): number => {
      let total = 0;
      for (const [key, count] of inventoryMap) {
        if (key.endsWith(`\0${itemId}`)) {
          total += count;
        }
      }
      return total;
    },
    [inventoryMap],
  );

  return { inventoryMap, getLevelOwnedCount, getItemTotalOwned };
}
