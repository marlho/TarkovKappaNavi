import type { QuestModel } from '../api/types';
import type { TaskStatus } from '../db/types';

export interface KappaStats {
  total: number;
  done: number;
  remaining: number;
  percent: number;
}

/**
 * kappaRequiredタスクからKappa全体進捗を算出する。
 */
export function calcKappaProgress(
  quests: QuestModel[],
  progressMap: Map<string, TaskStatus>,
): KappaStats {
  const kappaQuests = quests.filter((q) => q.kappaRequired);
  const total = kappaQuests.length;

  let done = 0;
  for (const q of kappaQuests) {
    const status = progressMap.get(q.id) ?? 'not_started';
    if (status === 'done') done++;
  }

  const remaining = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return { total, done, remaining, percent };
}

export interface TraderKappaStats {
  traderId: string;
  traderName: string;
  total: number;
  done: number;
  percent: number;
}

/**
 * トレーダー別にKappa進捗を算出する。
 */
export function calcKappaByTrader(
  quests: QuestModel[],
  progressMap: Map<string, TaskStatus>,
): TraderKappaStats[] {
  const kappaQuests = quests.filter((q) => q.kappaRequired);

  const byTrader = new Map<string, { name: string; total: number; done: number }>();

  for (const q of kappaQuests) {
    const entry = byTrader.get(q.traderId) ?? { name: q.traderName, total: 0, done: 0 };
    entry.total++;
    const status = progressMap.get(q.id) ?? 'not_started';
    if (status === 'done') entry.done++;
    byTrader.set(q.traderId, entry);
  }

  return Array.from(byTrader.entries()).map(([traderId, v]) => ({
    traderId,
    traderName: v.name,
    total: v.total,
    done: v.done,
    percent: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
  }));
}
