import type { QuestModel } from '../api/types';
import type { TaskStatus } from '../db/types';

/**
 * タスクがアンロック済みかどうかを判定する（常に動的に算出、保存しない）。
 *
 * アンロック条件:
 *   1. playerLevel >= task.minPlayerLevel
 *   2. すべての前提タスクが"done"
 */
export function isTaskUnlocked(
  task: QuestModel,
  playerLevel: number,
  progressMap: Map<string, TaskStatus>,
): boolean {
  if (playerLevel < task.minPlayerLevel) return false;

  for (const prereqId of task.prereqIds) {
    const status = progressMap.get(prereqId) ?? 'not_started';
    if (status !== 'done') return false;
  }

  return true;
}

export type TaskLockState = 'unlocked' | 'level_locked' | 'prereq_locked';

/**
 * タスクがロックされている理由を返す。利用可能な場合は'unlocked'を返す。
 */
export function getTaskLockState(
  task: QuestModel,
  playerLevel: number,
  progressMap: Map<string, TaskStatus>,
): TaskLockState {
  if (playerLevel < task.minPlayerLevel) return 'level_locked';

  for (const prereqId of task.prereqIds) {
    const status = progressMap.get(prereqId) ?? 'not_started';
    if (status !== 'done') return 'prereq_locked';
  }

  return 'unlocked';
}

/**
 * すべてのクエストをアンロック済みとロック済みのリストに分割する。
 */
export function partitionByLock(
  quests: QuestModel[],
  playerLevel: number,
  progressMap: Map<string, TaskStatus>,
): { unlocked: QuestModel[]; locked: QuestModel[] } {
  const unlocked: QuestModel[] = [];
  const locked: QuestModel[] = [];

  for (const q of quests) {
    if (isTaskUnlocked(q, playerLevel, progressMap)) {
      unlocked.push(q);
    } else {
      locked.push(q);
    }
  }

  return { unlocked, locked };
}

/**
 * 自動Start候補を検出する。
 * not_started かつ unlocked なタスクのIDリストを返す。
 */
export function findAutoStartCandidates(
  quests: QuestModel[],
  playerLevel: number,
  progressMap: Map<string, TaskStatus>,
): string[] {
  return quests
    .filter((q) => {
      const status = progressMap.get(q.id) ?? 'not_started';
      return status === 'not_started' && isTaskUnlocked(q, playerLevel, progressMap);
    })
    .map((q) => q.id);
}
