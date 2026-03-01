import type { QuestModel } from '../api/types';
import type { TaskStatus } from '../db/types';
import type { TaskLockState } from './unlock';
import { getTaskLockState } from './unlock';

export interface FilterParams {
  traders: string[];
  maps: string[];
  types: string[];
  statuses: TaskStatus[];
  search: string;
  kappaOnly: boolean;
}

export interface EnrichedTask {
  quest: QuestModel;
  status: TaskStatus;
  lockState: TaskLockState;
}

/**
 * クエストに現在のステータスとロック状態を付与する。
 */
export function enrichTasks(
  quests: QuestModel[],
  playerLevel: number,
  progressMap: Map<string, TaskStatus>,
): EnrichedTask[] {
  return quests.map((quest) => ({
    quest,
    status: progressMap.get(quest.id) ?? 'not_started',
    lockState: getTaskLockState(quest, playerLevel, progressMap),
  }));
}

/**
 * Tasks画面用のフィルタ＆ソートパイプライン。
 */
export function filterTasks(
  tasks: EnrichedTask[],
  filters: FilterParams,
): EnrichedTask[] {
  let result = tasks;

  if (filters.kappaOnly) {
    result = result.filter((t) => t.quest.kappaRequired);
  }

  if (filters.traders.length > 0) {
    const set = new Set(filters.traders);
    result = result.filter((t) => set.has(t.quest.traderId));
  }

  if (filters.maps.length > 0) {
    const set = new Set(filters.maps);
    result = result.filter((t) => {
      if (t.quest.mapId && set.has(t.quest.mapId)) return true;
      // 目標のマップもチェック
      return t.quest.objectives.some((o) => o.mapIds.some((mid) => set.has(mid)));
    });
  }

  if (filters.types.length > 0) {
    const set = new Set(filters.types);
    result = result.filter((t) =>
      t.quest.objectives.some((o) => set.has(o.type)),
    );
  }

  if (filters.statuses.length > 0) {
    const set = new Set(filters.statuses);
    result = result.filter((t) => set.has(t.status));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.quest.name.toLowerCase().includes(q) ||
        t.quest.traderName.toLowerCase().includes(q),
    );
  }

  // ソート: アンロック済み優先 → minPlayerLevel順 → 名前のアルファベット順
  result.sort((a, b) => {
    const lockOrder = (ls: TaskLockState) =>
      ls === 'unlocked' ? 0 : ls === 'level_locked' ? 2 : 1;
    const la = lockOrder(a.lockState);
    const lb = lockOrder(b.lockState);
    if (la !== lb) return la - lb;

    if (a.quest.minPlayerLevel !== b.quest.minPlayerLevel)
      return a.quest.minPlayerLevel - b.quest.minPlayerLevel;

    return a.quest.name.localeCompare(b.quest.name);
  });

  return result;
}
