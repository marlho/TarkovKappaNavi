import { useRef, useEffect, useCallback } from 'react';
import { useT } from '../../i18n';
import type { NormalizedHideout } from '../../api/types';
import { getNextBuildableLevel, isLevelBuildable, getStationBuildState, type StationBuildState } from '../../domain/hideoutUnlock';
import { useHideoutItemInventory } from '../../hooks/useHideoutItemInventory';
import { setHideoutLevelItemCount, clearHideoutLevelItemsByItemId } from '../../db/operations';
import styles from './BuildableSummary.module.css';
import counterStyles from './ItemCounter.module.css';

interface BuildableSummaryProps {
  hideout: NormalizedHideout;
  builtLevelIds: Set<string>;
  filter: 'buildable' | 'not_built' | 'all';
  compact?: boolean;
}

interface ItemGroupEntry {
  levelId: string;
  stationName: string;
  levelNumber: number;
  count: number;
}

interface ItemGroup {
  itemId: string;
  itemName: string;
  iconLink: string | null;
  totalCount: number;
  entries: ItemGroupEntry[];
}

const STATE_ORDER: Record<StationBuildState, number> = {
  has_buildable: 0,
  locked: 1,
  all_built: 2,
};

export function BuildableSummary({ hideout, builtLevelIds, filter, compact }: BuildableSummaryProps) {
  const t = useT();
  const { getLevelOwnedCount, getItemTotalOwned } = useHideoutItemInventory();

  // フィルタに基づいてレベル一覧を取得
  const levelEntries = (() => {
    if (filter === 'buildable') {
      return hideout.stations
        .map((s) => {
          const level = getNextBuildableLevel(s, builtLevelIds);
          if (!level) return null;
          if (!isLevelBuildable(level, builtLevelIds, hideout)) return null;
          return { station: s, level };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null && e.level.itemRequirements.length > 0);
    } else if (filter === 'not_built') {
      return hideout.stations.flatMap((s) =>
        s.levels
          .filter((l) => !builtLevelIds.has(l.id) && l.itemRequirements.length > 0)
          .map((l) => ({ station: s, level: l })),
      );
    } else {
      return hideout.stations.flatMap((s) =>
        s.levels
          .filter((l) => l.itemRequirements.length > 0)
          .map((l) => ({ station: s, level: l })),
      );
    }
  })();

  // グリッドと同じ順序でソート（buildState → name順）
  const sortedLevelEntries = [...levelEntries].sort((a, b) => {
    const stateA = getStationBuildState(a.station, builtLevelIds, hideout);
    const stateB = getStationBuildState(b.station, builtLevelIds, hideout);
    const orderDiff = STATE_ORDER[stateA] - STATE_ORDER[stateB];
    if (orderDiff !== 0) return orderDiff;
    const nameDiff = a.station.name.localeCompare(b.station.name);
    if (nameDiff !== 0) return nameDiff;
    return a.level.level - b.level.level;
  });

  // アイテムごとにグループ化
  const groupMap = new Map<string, ItemGroup>();
  for (const { station, level } of sortedLevelEntries) {
    for (const req of level.itemRequirements) {
      const existing = groupMap.get(req.itemId);
      if (existing) {
        existing.totalCount += req.count;
        existing.entries.push({
          levelId: level.id,
          stationName: station.name,
          levelNumber: level.level,
          count: req.count,
        });
      } else {
        groupMap.set(req.itemId, {
          itemId: req.itemId,
          itemName: req.itemName,
          iconLink: req.iconLink,
          totalCount: req.count,
          entries: [{
            levelId: level.id,
            stationName: station.name,
            levelNumber: level.level,
            count: req.count,
          }],
        });
      }
    }
  }

  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (b.entries.length !== a.entries.length) return b.entries.length - a.entries.length;
    return a.itemName.localeCompare(b.itemName);
  });

  // グループごとの振り分け操作ハンドラを生成
  function makeHandlers(group: ItemGroup) {
    const ownedCount = getItemTotalOwned(group.itemId);
    const fulfilled = ownedCount >= group.totalCount;
    const step = group.totalCount % 1000 === 0 ? 1000 : group.totalCount % 100 === 0 ? 100 : 1;

    // +: 先頭エントリから順に、まだcountに達していないレベルに加算
    const handleIncrement = () => {
      let remaining = step;
      for (const entry of group.entries) {
        if (remaining <= 0) break;
        const current = getLevelOwnedCount(entry.levelId, group.itemId);
        if (current < entry.count) {
          const add = Math.min(remaining, entry.count - current);
          setHideoutLevelItemCount(entry.levelId, group.itemId, current + add);
          remaining -= add;
        }
      }
      if (remaining > 0 && group.entries.length > 0) {
        const first = group.entries[0];
        const current = getLevelOwnedCount(first.levelId, group.itemId);
        setHideoutLevelItemCount(first.levelId, group.itemId, current + remaining);
      }
    };

    // -: 末尾エントリから順に、割り当てがあるレベルから減算
    const handleDecrement = () => {
      let remaining = step;
      for (let i = group.entries.length - 1; i >= 0; i--) {
        if (remaining <= 0) break;
        const entry = group.entries[i];
        const current = getLevelOwnedCount(entry.levelId, group.itemId);
        if (current > 0) {
          const sub = Math.min(remaining, current);
          setHideoutLevelItemCount(entry.levelId, group.itemId, current - sub);
          remaining -= sub;
        }
      }
    };

    // MAX: 全エントリをcountにセット
    const handleFill = () => {
      for (const entry of group.entries) {
        setHideoutLevelItemCount(entry.levelId, group.itemId, entry.count);
      }
    };

    // MIN: 全エントリを0にクリア
    const handleClear = () => {
      clearHideoutLevelItemsByItemId(group.itemId);
    };

    return { ownedCount, fulfilled, handleIncrement, handleDecrement, handleFill, handleClear };
  }

  // マーキー: はみ出し検出
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const checkOverflow = useCallback(() => {
    if (!nameContainerRef.current) return;
    const els = nameContainerRef.current.querySelectorAll(`.${counterStyles.itemName}`);
    els.forEach((el) => {
      const isOver = el.scrollWidth > el.clientWidth + 1;
      el.classList.toggle(counterStyles.overflowing, isOver);
      if (isOver) {
        const offset = el.clientWidth - el.scrollWidth;
        (el as HTMLElement).style.setProperty('--marquee-offset', `${offset}px`);
        const dur = Math.max(4, Math.abs(offset) / 20);
        (el as HTMLElement).style.setProperty('--marquee-dur', `${dur}s`);
      }
    });
  }, []);
  useEffect(() => {
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (nameContainerRef.current) ro.observe(nameContainerRef.current);
    return () => ro.disconnect();
  }, [checkOverflow, groups]);

  if (groups.length === 0) {
    return <p className={styles.empty}>{t.hideout_summary_empty}</p>;
  }

  if (compact) {
    return (
      <div className={styles.compactGrid}>
        {groups.map((group) => {
          const { ownedCount, fulfilled, handleIncrement, handleDecrement } = makeHandlers(group);
          return (
            <div
              key={group.itemId}
              className={`${styles.compactCell} ${fulfilled ? styles.fulfilled : ''}`}
              title={group.itemName}
            >
              {group.iconLink && (
                <img src={group.iconLink} alt="" className={styles.compactIcon} />
              )}
              <span className={styles.compactCount}>
                {ownedCount}/{group.totalCount}
              </span>
              <div className={styles.compactControls}>
                <button
                  className={styles.compactBtn}
                  onClick={handleDecrement}
                  disabled={ownedCount <= 0}
                >
                  &minus;
                </button>
                <button
                  className={styles.compactBtn}
                  onClick={handleIncrement}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.list} ref={nameContainerRef}>
      {groups.map((group) => {
        const { ownedCount, fulfilled, handleIncrement, handleDecrement, handleFill, handleClear } = makeHandlers(group);

        // 各エントリの割り当て数を表示用に計算
        const entryDetails = group.entries.map((e) => {
          const allocated = getLevelOwnedCount(e.levelId, group.itemId);
          return `${e.stationName} Lv${e.levelNumber} (${allocated}/${e.count})`;
        });

        return (
          <div key={group.itemId} className={styles.section}>
            <div className={`${styles.itemRow} ${fulfilled ? styles.fulfilled : ''}`}>
              {group.iconLink && (
                <img src={group.iconLink} alt="" className={styles.icon} />
              )}
              <span className={counterStyles.itemName} title={group.itemName}>
                <span className={counterStyles.itemNameInner}>{group.itemName}</span>
              </span>
              <span className={counterStyles.need}>&times;{group.totalCount}</span>
              <div className={counterStyles.controls}>
                <button
                  className={counterStyles.btn}
                  onClick={handleDecrement}
                  disabled={ownedCount <= 0}
                >
                  &minus;
                </button>
                <span className={counterStyles.owned}>{ownedCount}</span>
                <button className={counterStyles.btn} onClick={handleIncrement}>
                  +
                </button>
                <div className={counterStyles.stackBtns}>
                  <button
                    className={`${counterStyles.stackBtn} ${counterStyles.fillBtn}`}
                    onClick={handleFill}
                    disabled={fulfilled}
                    title={`${group.totalCount}にセット`}
                  >
                    MAX
                  </button>
                  <button
                    className={`${counterStyles.stackBtn} ${counterStyles.clearBtn}`}
                    onClick={handleClear}
                    disabled={ownedCount <= 0}
                    title="0にセット"
                  >
                    MIN
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.subText}>
              └ {entryDetails.join(', ')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
