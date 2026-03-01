import type { QuestModel } from '../api/types';
import type { TaskStatus } from '../db/types';

export interface NextUnlockGroup {
  level: number;
  tasks: QuestModel[];
}

/**
 * 現在のレベルから+Nレベル以内に解放されるタスクを検出する。
 * レベルロック中だが前提条件はすべて満たしているタスクのみ含む。
 */
export function getNextUnlocks(
  quests: QuestModel[],
  playerLevel: number,
  progressMap: Map<string, TaskStatus>,
  levelRange = 5,
): NextUnlockGroup[] {
  const maxLevel = playerLevel + levelRange;

  const candidates = quests.filter((q) => {
    // 現在のレベルより上、かつ範囲内であること
    if (q.minPlayerLevel <= playerLevel || q.minPlayerLevel > maxLevel) return false;

    // 完了済みでないこと
    const status = progressMap.get(q.id) ?? 'not_started';
    if (status === 'done') return false;

    // すべての前提条件が満たされていること
    for (const pid of q.prereqIds) {
      const pStatus = progressMap.get(pid) ?? 'not_started';
      if (pStatus !== 'done') return false;
    }

    return true;
  });

  // minPlayerLevelでグループ化
  const grouped = new Map<number, QuestModel[]>();
  for (const q of candidates) {
    const list = grouped.get(q.minPlayerLevel) ?? [];
    list.push(q);
    grouped.set(q.minPlayerLevel, list);
  }

  // レベル昇順でソート
  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, tasks]) => ({ level, tasks }));
}
