import { describe, it, expect } from 'vitest';
import { isTaskUnlocked, getTaskLockState, partitionByLock } from '../unlock';
import type { QuestModel } from '../../api/types';
import type { TaskStatus } from '../../db/types';

function makeQuest(overrides: Partial<QuestModel> = {}): QuestModel {
  return {
    id: 'q1',
    name: 'Test Quest',
    traderId: 't1',
    traderName: 'Prapor',
    mapId: 'm1',
    mapName: 'Customs',
    kappaRequired: true,
    minPlayerLevel: 1,
    wikiLink: '',
    imageLink: null,
    prereqIds: [],
    objectives: [],
    ...overrides,
  };
}

describe('isTaskUnlocked', () => {
  it('unlocks a task with no prereqs when level is sufficient', () => {
    const q = makeQuest({ minPlayerLevel: 5 });
    expect(isTaskUnlocked(q, 5, new Map())).toBe(true);
    expect(isTaskUnlocked(q, 10, new Map())).toBe(true);
  });

  it('locks a task when level is insufficient', () => {
    const q = makeQuest({ minPlayerLevel: 10 });
    expect(isTaskUnlocked(q, 9, new Map())).toBe(false);
  });

  it('unlocks when all prereqs are done', () => {
    const q = makeQuest({ prereqIds: ['p1', 'p2'] });
    const pm = new Map<string, TaskStatus>([
      ['p1', 'done'],
      ['p2', 'done'],
    ]);
    expect(isTaskUnlocked(q, 1, pm)).toBe(true);
  });

  it('locks when a prereq is in_progress', () => {
    const q = makeQuest({ prereqIds: ['p1'] });
    const pm = new Map<string, TaskStatus>([['p1', 'in_progress']]);
    expect(isTaskUnlocked(q, 1, pm)).toBe(false);
  });

  it('locks when a prereq has no progress entry (not_started)', () => {
    const q = makeQuest({ prereqIds: ['p1'] });
    expect(isTaskUnlocked(q, 1, new Map())).toBe(false);
  });
});

describe('getTaskLockState', () => {
  it('returns level_locked when level is too low', () => {
    const q = makeQuest({ minPlayerLevel: 15, prereqIds: ['p1'] });
    const pm = new Map<string, TaskStatus>([['p1', 'not_started']]);
    expect(getTaskLockState(q, 10, pm)).toBe('level_locked');
  });

  it('returns prereq_locked when prereqs are incomplete', () => {
    const q = makeQuest({ minPlayerLevel: 1, prereqIds: ['p1'] });
    expect(getTaskLockState(q, 1, new Map())).toBe('prereq_locked');
  });

  it('returns unlocked when all conditions met', () => {
    const q = makeQuest({ minPlayerLevel: 1, prereqIds: ['p1'] });
    const pm = new Map<string, TaskStatus>([['p1', 'done']]);
    expect(getTaskLockState(q, 1, pm)).toBe('unlocked');
  });
});

describe('partitionByLock', () => {
  it('partitions quests correctly', () => {
    const quests = [
      makeQuest({ id: 'q1', minPlayerLevel: 1 }),
      makeQuest({ id: 'q2', minPlayerLevel: 10 }),
      makeQuest({ id: 'q3', minPlayerLevel: 1, prereqIds: ['q1'] }),
    ];
    const pm = new Map<string, TaskStatus>([['q1', 'done']]);
    const { unlocked, locked } = partitionByLock(quests, 5, pm);
    expect(unlocked.map((q) => q.id)).toEqual(['q1', 'q3']);
    expect(locked.map((q) => q.id)).toEqual(['q2']);
  });
});
