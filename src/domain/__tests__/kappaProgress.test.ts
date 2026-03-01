import { describe, it, expect } from 'vitest';
import { calcKappaProgress, calcKappaByTrader } from '../kappaProgress';
import type { QuestModel } from '../../api/types';
import type { TaskStatus } from '../../db/types';

function makeQuest(id: string, kappa: boolean, traderId = 't1', traderName = 'Prapor'): QuestModel {
  return {
    id,
    name: `Quest ${id}`,
    traderId,
    traderName,
    mapId: null,
    mapName: null,
    kappaRequired: kappa,
    minPlayerLevel: 1,
    wikiLink: '',
    imageLink: null,
    prereqIds: [],
    objectives: [],
  };
}

describe('calcKappaProgress', () => {
  it('returns zero stats when no quests', () => {
    const stats = calcKappaProgress([], new Map());
    expect(stats).toEqual({ total: 0, done: 0, remaining: 0, percent: 0 });
  });

  it('only counts kappaRequired quests', () => {
    const quests = [
      makeQuest('q1', true),
      makeQuest('q2', false),
      makeQuest('q3', true),
    ];
    const stats = calcKappaProgress(quests, new Map());
    expect(stats.total).toBe(2);
    expect(stats.remaining).toBe(2);
  });

  it('calculates done correctly', () => {
    const quests = [
      makeQuest('q1', true),
      makeQuest('q2', true),
      makeQuest('q3', true),
      makeQuest('q4', true),
    ];
    const pm = new Map<string, TaskStatus>([
      ['q1', 'done'],
      ['q2', 'done'],
    ]);
    const stats = calcKappaProgress(quests, pm);
    expect(stats.total).toBe(4);
    expect(stats.done).toBe(2);
    expect(stats.remaining).toBe(2);
    expect(stats.percent).toBe(50); // 2/4 done
  });
});

describe('calcKappaByTrader', () => {
  it('groups kappa tasks by trader', () => {
    const quests = [
      makeQuest('q1', true, 'prapor', 'Prapor'),
      makeQuest('q2', true, 'prapor', 'Prapor'),
      makeQuest('q3', true, 'therapist', 'Therapist'),
      makeQuest('q4', false, 'prapor', 'Prapor'),
    ];
    const pm = new Map<string, TaskStatus>([['q1', 'done']]);
    const result = calcKappaByTrader(quests, pm);
    expect(result).toHaveLength(2);

    const prapor = result.find((t) => t.traderId === 'prapor')!;
    expect(prapor.total).toBe(2);
    expect(prapor.done).toBe(1);
    expect(prapor.percent).toBe(50);

    const therapist = result.find((t) => t.traderId === 'therapist')!;
    expect(therapist.total).toBe(1);
    expect(therapist.done).toBe(0);
  });
});
