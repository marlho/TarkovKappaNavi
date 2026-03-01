import { useMemo } from 'react';
import type { NormalizedHideout } from '../../api/types';
import { getStationCurrentLevel, getStationBuildState, getNextBuildableLevel, type StationBuildState } from '../../domain/hideoutUnlock';
import { useHideoutItemInventory } from '../../hooks/useHideoutItemInventory';
import { useHideoutStore } from '../../stores/hideoutStore';
import styles from './HideoutGrid.module.css';

interface HideoutGridProps {
  hideout: NormalizedHideout;
  builtLevelIds: Set<string>;
}

function stateClass(state: StationBuildState): string {
  if (state === 'all_built') return styles.allBuilt;
  if (state === 'has_buildable') return styles.hasBuildable;
  return styles.locked;
}

const STATE_ORDER: Record<StationBuildState, number> = {
  has_buildable: 0,
  locked: 1,
  all_built: 2,
};

export function HideoutGrid({ hideout, builtLevelIds }: HideoutGridProps) {
  const selectedStationId = useHideoutStore((s) => s.selectedStationId);
  const setSelected = useHideoutStore((s) => s.setSelectedStationId);
  const { getLevelOwnedCount } = useHideoutItemInventory();

  const sortedStations = useMemo(() => {
    return [...hideout.stations].sort((a, b) => {
      const stateA = getStationBuildState(a, builtLevelIds, hideout);
      const stateB = getStationBuildState(b, builtLevelIds, hideout);
      const orderDiff = STATE_ORDER[stateA] - STATE_ORDER[stateB];
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
  }, [hideout, builtLevelIds]);

  return (
    <div className={styles.grid}>
      {sortedStations.map((station) => {
        const currentLevel = getStationCurrentLevel(station, builtLevelIds);
        const buildState = getStationBuildState(station, builtLevelIds, hideout);
        const pct = station.maxLevel > 0 ? (currentLevel / station.maxLevel) * 100 : 0;
        const nextLevel = getNextBuildableLevel(station, builtLevelIds);
        const missingItems = nextLevel
          ? nextLevel.itemRequirements.filter(
              (r) => getLevelOwnedCount(nextLevel.id, r.itemId) < r.count,
            )
          : [];

        return (
          <div
            key={station.id}
            className={`${styles.card} ${stateClass(buildState)} ${selectedStationId === station.id ? styles.selected : ''}`}
            onClick={() => setSelected(station.id)}
          >
            <div className={styles.name}>{station.name}</div>
            <div className={styles.levelInfo}>
              <span className={styles.levelText}>Lv {currentLevel}/{station.maxLevel}</span>
              <div className={styles.miniBar}>
                <div className={styles.miniBarFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
            {missingItems.length > 0 && (
              <div className={styles.missingItems}>
                {missingItems.map((r) => (
                  <span key={r.itemId} className={styles.missingItem}>
                    {r.iconLink && <img src={r.iconLink} alt="" className={styles.missingIcon} />}
                    <span className={styles.missingCount}>
                      {getLevelOwnedCount(nextLevel!.id, r.itemId)}/{r.count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
