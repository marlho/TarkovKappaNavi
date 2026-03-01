import { useEffect, useRef } from 'react';
import type { NormalizedHideout } from '../api/types';
import { getStationBuildState, type StationBuildState } from '../domain/hideoutUnlock';
import { db } from '../db/database';
import { migrateGlobalToLevelInventory } from '../db/operations';

const STATE_ORDER: Record<StationBuildState, number> = {
  has_buildable: 0,
  locked: 1,
  all_built: 2,
};

/**
 * グローバル在庫（hideoutInventory）からレベル別在庫（hideoutLevelInventory）への
 * ワンタイム遅延移行を実行する。
 * HideoutPageでAPI読み込み完了後に呼び出す。
 */
export function useInventoryMigration(
  hideout: NormalizedHideout | undefined,
  builtLevelIds: Set<string>,
) {
  const migrated = useRef(false);

  useEffect(() => {
    if (!hideout || migrated.current) return;

    (async () => {
      // 旧テーブルにデータがあるか確認
      const oldCount = await db.hideoutInventory.count();
      if (oldCount === 0) {
        migrated.current = true;
        return;
      }

      // 既にレベル別テーブルにデータがあれば移行済みとみなし旧テーブルをクリア
      const newCount = await db.hideoutLevelInventory.count();
      if (newCount > 0) {
        await db.hideoutInventory.clear();
        migrated.current = true;
        return;
      }

      // ステーションをグリッドと同じ順序でソート
      const sortedStations = [...hideout.stations].sort((a, b) => {
        const stateA = getStationBuildState(a, builtLevelIds, hideout);
        const stateB = getStationBuildState(b, builtLevelIds, hideout);
        const orderDiff = STATE_ORDER[stateA] - STATE_ORDER[stateB];
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });

      // 全レベルの必要アイテムをフラット化（ステーション順）
      const levelEntries: Array<{ levelId: string; itemId: string; count: number }> = [];
      for (const station of sortedStations) {
        for (const level of station.levels) {
          for (const req of level.itemRequirements) {
            levelEntries.push({
              levelId: level.id,
              itemId: req.itemId,
              count: req.count,
            });
          }
        }
      }

      await migrateGlobalToLevelInventory(levelEntries);
      migrated.current = true;
    })();
  }, [hideout, builtLevelIds]);
}
