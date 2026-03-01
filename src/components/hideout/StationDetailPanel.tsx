import { useMemo } from 'react';
import type { HideoutStationModel, NormalizedHideout, HideoutLevelModel } from '../../api/types';
import {
  getHideoutBuildState,
  getStationCurrentLevel,
  getNextBuildableLevel,
  type HideoutBuildState,
} from '../../domain/hideoutUnlock';
import { buildHideoutLevel, unbuildHideoutLevelAndAbove } from '../../db/operations';
import { useHideoutItemInventory } from '../../hooks/useHideoutItemInventory';
import { useT } from '../../i18n';
import { CraftList } from './CraftList';
import { ItemCounter } from './ItemCounter';
import styles from './StationDetailPanel.module.css';

interface StationDetailPanelProps {
  station: HideoutStationModel | null;
  hideout: NormalizedHideout;
  builtLevelIds: Set<string>;
}

function BuildStateLabel({ state }: { state: HideoutBuildState }) {
  const t = useT();
  if (state === 'built') return <span className={styles.stateBuilt}>{t.hideout_built}</span>;
  if (state === 'buildable') return <span className={styles.stateBuildable}>{t.hideout_buildable}</span>;
  return <span className={styles.stateLocked}>{t.hideout_locked}</span>;
}

function LevelRequirements({ level }: { level: HideoutLevelModel }) {
  const hasReqs = level.itemRequirements.length > 0
    || level.stationLevelRequirements.length > 0
    || level.skillRequirements.length > 0
    || level.traderRequirements.length > 0;

  if (!hasReqs) return null;

  return (
    <div className={styles.reqList}>
      {level.stationLevelRequirements.map((r, i) => (
        <div key={`s-${i}`} className={styles.reqItem}>
          <span>{r.stationName} Lv {r.level}</span>
        </div>
      ))}
      {level.traderRequirements.map((r, i) => (
        <div key={`t-${i}`} className={styles.reqItem}>
          <span>{r.traderName} Lv {r.level}</span>
        </div>
      ))}
      {level.skillRequirements.map((r, i) => (
        <div key={`sk-${i}`} className={styles.reqItem}>
          <span>{r.name} Lv {r.level}</span>
        </div>
      ))}
      {level.itemRequirements.map((r, i) => (
        <div key={`i-${i}`} className={styles.reqItem}>
          {r.iconLink && <img src={r.iconLink} alt="" className={styles.reqIcon} />}
          <span>{r.itemName}</span>
          <span> x{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export function StationDetailPanel({ station, hideout, builtLevelIds }: StationDetailPanelProps) {
  const t = useT();
  const { getLevelOwnedCount } = useHideoutItemInventory();

  const currentLevel = station ? getStationCurrentLevel(station, builtLevelIds) : 0;

  const nextLevel = useMemo(() => {
    if (!station) return null;
    return getNextBuildableLevel(station, builtLevelIds);
  }, [station, builtLevelIds]);

  // 現在レベル以下で利用可能なクラフト（hookは条件分岐の前に呼ぶ）
  const availableCrafts = useMemo(() => {
    if (!station) return [];
    return station.levels
      .filter((l) => l.level <= currentLevel)
      .flatMap((l) => l.crafts);
  }, [station, currentLevel]);

  if (!station) {
    return <div className={styles.placeholder}>{t.hideout_select_station}</div>;
  }

  const handleBuild = async (level: HideoutLevelModel) => {
    await buildHideoutLevel(level.id, level.stationId, level.level);
  };

  const handleUnbuild = async (level: HideoutLevelModel) => {
    await unbuildHideoutLevelAndAbove(level.stationId, level.level);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {station.imageLink && (
          <img src={station.imageLink} alt="" className={styles.stationImage} />
        )}
        <div>
          <div className={styles.stationName}>{station.name}</div>
          <div className={styles.stationLevel}>Lv {currentLevel} / {station.maxLevel}</div>
        </div>
      </div>

      {/* 次レベルの必要アイテム */}
      {nextLevel && nextLevel.itemRequirements.length > 0 && (
        <div className={styles.inventorySection}>
          <div className={styles.sectionTitle}>
            {t.hideout_next_items.replace('{level}', String(nextLevel.level))}
          </div>
          {nextLevel.itemRequirements.map((req) => (
            <ItemCounter
              key={req.itemId}
              levelId={nextLevel.id}
              itemId={req.itemId}
              itemName={req.itemName}
              iconLink={req.iconLink}
              count={req.count}
              ownedCount={getLevelOwnedCount(nextLevel.id, req.itemId)}
            />
          ))}
        </div>
      )}

      {/* レベル一覧 */}
      <div className={styles.sectionTitle}>{t.hideout_levels}</div>
      {station.levels.map((level) => {
        const state = getHideoutBuildState(level, builtLevelIds, hideout);
        return (
          <div key={level.id} className={styles.levelCard}>
            <div className={styles.levelHeader}>
              <span className={styles.levelLabel}>{t.hideout_level_n.replace('{level}', String(level.level))}</span>
              <BuildStateLabel state={state} />
            </div>
            <LevelRequirements level={level} />
            {level.bonuses.length > 0 && (
              <div className={styles.bonusList}>
                {level.bonuses.map((b, i) => (
                  <div key={i} className={styles.bonusItem}>
                    <span>{b.name}:</span>
                    <span className={styles.bonusValue}>
                      {b.value > 0 ? `+${b.value}` : b.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {state === 'buildable' && (
              <button className={styles.buildBtn} onClick={() => handleBuild(level)}>
                {t.hideout_build}
              </button>
            )}
            {state === 'built' && (
              <button className={styles.unbuildBtn} onClick={() => handleUnbuild(level)}>
                {t.hideout_undo}
              </button>
            )}
          </div>
        );
      })}

      {/* クラフト */}
      {availableCrafts.length > 0 && (
        <div className={styles.craftSection}>
          <div className={styles.sectionTitle}>{t.hideout_crafts_count.replace('{count}', String(availableCrafts.length))}</div>
          <CraftList crafts={availableCrafts} />
        </div>
      )}
    </div>
  );
}
