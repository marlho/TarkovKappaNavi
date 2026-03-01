import type { HideoutLevelModel, HideoutStationModel, NormalizedHideout } from '../api/types';

export type HideoutBuildState = 'built' | 'buildable' | 'locked';

/**
 * 指定レベルが建設可能かどうかを判定する。
 * 判定条件:
 *   1. 同一ステーションの前レベルがbuilt
 *   2. 他ステーションレベル要件がすべてbuilt
 * ※アイテム・スキル・トレーダー要件は表示のみ、判定には含めない
 */
export function isLevelBuildable(
  level: HideoutLevelModel,
  builtLevelIds: Set<string>,
  hideout: NormalizedHideout,
): boolean {
  // 同一ステーション前レベルチェック
  if (level.level > 1) {
    const station = hideout.stationMap.get(level.stationId);
    if (station) {
      const prevLevel = station.levels.find((l) => l.level === level.level - 1);
      if (prevLevel && !builtLevelIds.has(prevLevel.id)) return false;
    }
  }

  // 他ステーションレベル要件チェック
  for (const req of level.stationLevelRequirements) {
    const reqStation = hideout.stationMap.get(req.stationId);
    if (!reqStation) return false;
    const reqLevel = reqStation.levels.find((l) => l.level === req.level);
    if (!reqLevel || !builtLevelIds.has(reqLevel.id)) return false;
  }

  return true;
}

/**
 * 指定レベルのビルド状態を取得する。
 */
export function getHideoutBuildState(
  level: HideoutLevelModel,
  builtLevelIds: Set<string>,
  hideout: NormalizedHideout,
): HideoutBuildState {
  if (builtLevelIds.has(level.id)) return 'built';
  if (isLevelBuildable(level, builtLevelIds, hideout)) return 'buildable';
  return 'locked';
}

/**
 * ステーションの現在の最大builtレベルを返す (0=未建設)
 */
export function getStationCurrentLevel(
  station: HideoutStationModel,
  builtLevelIds: Set<string>,
): number {
  let maxBuilt = 0;
  for (const level of station.levels) {
    if (builtLevelIds.has(level.id) && level.level > maxBuilt) {
      maxBuilt = level.level;
    }
  }
  return maxBuilt;
}

/**
 * ステーションの次の建設可能レベルを返す。全レベル built 済みなら null。
 */
export function getNextBuildableLevel(
  station: HideoutStationModel,
  builtLevelIds: Set<string>,
): HideoutLevelModel | null {
  const currentLevel = getStationCurrentLevel(station, builtLevelIds);
  if (currentLevel >= station.maxLevel) return null;
  return station.levels.find((l) => l.level === currentLevel + 1) ?? null;
}

export type StationBuildState = 'all_built' | 'has_buildable' | 'locked';

/**
 * ステーション全体の状態を返す。
 */
export function getStationBuildState(
  station: HideoutStationModel,
  builtLevelIds: Set<string>,
  hideout: NormalizedHideout,
): StationBuildState {
  const currentLevel = getStationCurrentLevel(station, builtLevelIds);
  if (currentLevel >= station.maxLevel) return 'all_built';

  const nextLevel = station.levels.find((l) => l.level === currentLevel + 1);
  if (nextLevel && isLevelBuildable(nextLevel, builtLevelIds, hideout)) return 'has_buildable';

  return 'locked';
}

/**
 * ハイドアウト全体の進捗を計算する。
 */
export function calcHideoutProgress(
  hideout: NormalizedHideout,
  builtLevelIds: Set<string>,
): { totalLevels: number; builtCount: number; percent: number } {
  let totalLevels = 0;
  let builtCount = 0;

  for (const station of hideout.stations) {
    for (const level of station.levels) {
      totalLevels++;
      if (builtLevelIds.has(level.id)) builtCount++;
    }
  }

  const percent = totalLevels === 0 ? 0 : Math.round((builtCount / totalLevels) * 100);
  return { totalLevels, builtCount, percent };
}
