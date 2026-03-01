import { describe, it, expect } from 'vitest';
import {
  isLevelBuildable,
  getHideoutBuildState,
  getStationCurrentLevel,
  getStationBuildState,
  calcHideoutProgress,
} from '../hideoutUnlock';
import type { HideoutStationModel, HideoutLevelModel, NormalizedHideout } from '../../api/types';

function makeLevel(overrides: Partial<HideoutLevelModel> = {}): HideoutLevelModel {
  return {
    id: 'lv1',
    stationId: 's1',
    level: 1,
    constructionTime: 0,
    description: null,
    itemRequirements: [],
    stationLevelRequirements: [],
    skillRequirements: [],
    traderRequirements: [],
    crafts: [],
    bonuses: [],
    ...overrides,
  };
}

function makeStation(overrides: Partial<HideoutStationModel> = {}): HideoutStationModel {
  return {
    id: 's1',
    name: 'Generator',
    normalizedName: 'generator',
    imageLink: null,
    levels: [makeLevel()],
    maxLevel: 1,
    ...overrides,
  };
}

function makeHideout(stations: HideoutStationModel[]): NormalizedHideout {
  const stationMap = new Map<string, HideoutStationModel>();
  const levelMap = new Map<string, HideoutLevelModel>();
  for (const s of stations) {
    stationMap.set(s.id, s);
    for (const l of s.levels) levelMap.set(l.id, l);
  }
  return { stations, stationMap, levelMap, dependencyEdges: [] };
}

describe('isLevelBuildable', () => {
  it('レベル1は前提なしでbuildable', () => {
    const station = makeStation();
    const hideout = makeHideout([station]);
    expect(isLevelBuildable(station.levels[0], new Set(), hideout)).toBe(true);
  });

  it('レベル2は前レベルbuiltでbuildable', () => {
    const lv1 = makeLevel({ id: 'lv1', level: 1 });
    const lv2 = makeLevel({ id: 'lv2', level: 2 });
    const station = makeStation({ levels: [lv1, lv2], maxLevel: 2 });
    const hideout = makeHideout([station]);

    expect(isLevelBuildable(lv2, new Set(), hideout)).toBe(false);
    expect(isLevelBuildable(lv2, new Set(['lv1']), hideout)).toBe(true);
  });

  it('他ステーション要件もチェックする', () => {
    const depLv = makeLevel({ id: 'dep-lv1', stationId: 's2', level: 1 });
    const depStation = makeStation({ id: 's2', name: 'Workbench', levels: [depLv] });

    const lv1 = makeLevel({
      id: 'lv1',
      level: 1,
      stationLevelRequirements: [{ stationId: 's2', stationName: 'Workbench', level: 1 }],
    });
    const station = makeStation({ levels: [lv1] });
    const hideout = makeHideout([station, depStation]);

    expect(isLevelBuildable(lv1, new Set(), hideout)).toBe(false);
    expect(isLevelBuildable(lv1, new Set(['dep-lv1']), hideout)).toBe(true);
  });
});

describe('getHideoutBuildState', () => {
  it('builtならbuilt', () => {
    const station = makeStation();
    const hideout = makeHideout([station]);
    expect(getHideoutBuildState(station.levels[0], new Set(['lv1']), hideout)).toBe('built');
  });

  it('buildableならbuildable', () => {
    const station = makeStation();
    const hideout = makeHideout([station]);
    expect(getHideoutBuildState(station.levels[0], new Set(), hideout)).toBe('buildable');
  });

  it('lockedならlocked', () => {
    const lv1 = makeLevel({ id: 'lv1', level: 1 });
    const lv2 = makeLevel({ id: 'lv2', level: 2 });
    const station = makeStation({ levels: [lv1, lv2], maxLevel: 2 });
    const hideout = makeHideout([station]);
    expect(getHideoutBuildState(lv2, new Set(), hideout)).toBe('locked');
  });
});

describe('getStationCurrentLevel', () => {
  it('未建設なら0', () => {
    const station = makeStation();
    expect(getStationCurrentLevel(station, new Set())).toBe(0);
  });

  it('レベル1がbuiltなら1', () => {
    const station = makeStation();
    expect(getStationCurrentLevel(station, new Set(['lv1']))).toBe(1);
  });
});

describe('getStationBuildState', () => {
  it('全レベルbuiltならall_built', () => {
    const station = makeStation();
    const hideout = makeHideout([station]);
    expect(getStationBuildState(station, new Set(['lv1']), hideout)).toBe('all_built');
  });

  it('次レベルがbuildableならhas_buildable', () => {
    const lv1 = makeLevel({ id: 'lv1', level: 1 });
    const lv2 = makeLevel({ id: 'lv2', level: 2 });
    const station = makeStation({ levels: [lv1, lv2], maxLevel: 2 });
    const hideout = makeHideout([station]);
    expect(getStationBuildState(station, new Set(['lv1']), hideout)).toBe('has_buildable');
  });

  it('次レベルがlockedならlocked', () => {
    const lv1 = makeLevel({ id: 'lv1', level: 1 });
    const lv2 = makeLevel({ id: 'lv2', level: 2 });
    const station = makeStation({ levels: [lv1, lv2], maxLevel: 2 });
    const hideout = makeHideout([station]);
    expect(getStationBuildState(station, new Set(), hideout)).toBe('has_buildable');
  });
});

describe('calcHideoutProgress', () => {
  it('進捗率を正しく計算する', () => {
    const lv1 = makeLevel({ id: 'lv1', level: 1 });
    const lv2 = makeLevel({ id: 'lv2', level: 2 });
    const station = makeStation({ levels: [lv1, lv2], maxLevel: 2 });
    const hideout = makeHideout([station]);

    const result = calcHideoutProgress(hideout, new Set(['lv1']));
    expect(result.totalLevels).toBe(2);
    expect(result.builtCount).toBe(1);
    expect(result.percent).toBe(50);
  });

  it('空のハイドアウトなら0%', () => {
    const hideout = makeHideout([]);
    const result = calcHideoutProgress(hideout, new Set());
    expect(result.percent).toBe(0);
  });
});
