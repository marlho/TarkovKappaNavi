import { describe, it, expect } from 'vitest';
import {
  buildReverseDependencyGraph,
  countDownstreamTasks,
  getTaskMapIds,
  getRecommendations,
} from '../recommendations';
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

// ─── buildReverseDependencyGraph ───

describe('buildReverseDependencyGraph', () => {
  it('空のマップから空のグラフを構築', () => {
    const result = buildReverseDependencyGraph(new Map());
    expect(result.size).toBe(0);
  });

  it('単純な依存関係を反転', () => {
    // q2はq1に依存
    const edges = new Map([['q2', ['q1']]]);
    const reverse = buildReverseDependencyGraph(edges);
    expect(reverse.get('q1')).toEqual(['q2']);
    expect(reverse.has('q2')).toBe(false);
  });

  it('ダイヤモンド依存を正しく反転', () => {
    // q3はq1とq2に依存; q4はq2に依存
    const edges = new Map([
      ['q3', ['q1', 'q2']],
      ['q4', ['q2']],
    ]);
    const reverse = buildReverseDependencyGraph(edges);
    expect(reverse.get('q1')).toEqual(['q3']);
    expect(reverse.get('q2')?.sort()).toEqual(['q3', 'q4']);
  });
});

// ─── countDownstreamTasks ───

describe('countDownstreamTasks', () => {
  it('後続がない場合は0', () => {
    const reverse = new Map<string, string[]>();
    expect(countDownstreamTasks('q1', reverse, new Map())).toBe(0);
  });

  it('連鎖的な後続をカウント', () => {
    // q1 → q2 → q3
    const reverse = new Map([
      ['q1', ['q2']],
      ['q2', ['q3']],
    ]);
    expect(countDownstreamTasks('q1', reverse, new Map())).toBe(2);
  });

  it('doneの後続を除外', () => {
    // q1 → q2 → q3、ただしq2は完了済み
    const reverse = new Map([
      ['q1', ['q2']],
      ['q2', ['q3']],
    ]);
    const pm = new Map<string, TaskStatus>([['q2', 'done']]);
    // q2は完了済みなので除外; q3は到達不能
    expect(countDownstreamTasks('q1', reverse, pm)).toBe(0);
  });

  it('done後続の先も探索しない', () => {
    // q1 → q2(done) → q3(not_started)
    const reverse = new Map([
      ['q1', ['q2']],
      ['q2', ['q3']],
    ]);
    const pm = new Map<string, TaskStatus>([['q2', 'done']]);
    expect(countDownstreamTasks('q1', reverse, pm)).toBe(0);
  });

  it('サイクルがあっても無限ループしない', () => {
    // q1 → q2 → q1（循環）
    const reverse = new Map([
      ['q1', ['q2']],
      ['q2', ['q1']],
    ]);
    expect(countDownstreamTasks('q1', reverse, new Map())).toBe(1);
  });

  it('分岐する後続を正しくカウント', () => {
    // q1 → q2, q3; q2 → q4
    const reverse = new Map([
      ['q1', ['q2', 'q3']],
      ['q2', ['q4']],
    ]);
    expect(countDownstreamTasks('q1', reverse, new Map())).toBe(3);
  });
});

// ─── getTaskMapIds ───

describe('getTaskMapIds', () => {
  it('mapIdのみの場合', () => {
    const q = makeQuest({ mapId: 'm1', objectives: [] });
    expect(getTaskMapIds(q)).toEqual(['m1']);
  });

  it('mapIdがnullでobjectivesにマップがある場合', () => {
    const q = makeQuest({
      mapId: null,
      objectives: [
        { id: 'o1', type: 'kill', description: 'Kill', mapIds: ['m2', 'm3'] },
      ],
    });
    expect(getTaskMapIds(q).sort()).toEqual(['m2', 'm3']);
  });

  it('mapIdとobjectivesの重複を排除', () => {
    const q = makeQuest({
      mapId: 'm1',
      objectives: [
        { id: 'o1', type: 'kill', description: 'Kill', mapIds: ['m1', 'm2'] },
      ],
    });
    expect(getTaskMapIds(q).sort()).toEqual(['m1', 'm2']);
  });

  it('mapIdがnullでobjectivesも空なら空配列', () => {
    const q = makeQuest({ mapId: null, objectives: [] });
    expect(getTaskMapIds(q)).toEqual([]);
  });
});

// ─── getRecommendations 統合テスト ───

describe('getRecommendations', () => {
  it('候補が空なら空の結果を返す', () => {
    const result = getRecommendations([], new Map(), new Map(), 10);
    expect(result.topTasks).toEqual([]);
    expect(result.mapBatches).toEqual([]);
  });

  it('全タスクがdoneなら空', () => {
    const quests = [makeQuest({ id: 'q1' })];
    const pm = new Map<string, TaskStatus>([['q1', 'done']]);
    const result = getRecommendations(quests, new Map(), pm, 10);
    expect(result.topTasks).toEqual([]);
  });

  it('レベルロックのタスクは候補にならない', () => {
    const quests = [makeQuest({ id: 'q1', minPlayerLevel: 20 })];
    const result = getRecommendations(quests, new Map(), new Map(), 10);
    expect(result.topTasks).toEqual([]);
  });

  it('後続インパクトが高いタスクが上位に来る', () => {
    // q1: 後続なし, q2: q3が後続
    const quests = [
      makeQuest({ id: 'q1', mapId: null, kappaRequired: false }),
      makeQuest({ id: 'q2', mapId: null, kappaRequired: false }),
      makeQuest({
        id: 'q3',
        prereqIds: ['q2'],
        minPlayerLevel: 99,
        mapId: null,
        kappaRequired: true,
      }),
    ];
    const edges = new Map([['q3', ['q2']]]);
    const result = getRecommendations(quests, edges, new Map(), 1);
    // q2の後続数=1、q1の後続数=0
    expect(result.topTasks[0].quest.id).toBe('q2');
    expect(result.topTasks[0].downstreamCount).toBe(1);
  });

  it('マップバッチが反映される', () => {
    const quests = [
      makeQuest({ id: 'q1', mapId: 'customs', mapName: 'Customs', kappaRequired: true }),
      makeQuest({ id: 'q2', mapId: 'customs', mapName: 'Customs', kappaRequired: true }),
      makeQuest({ id: 'q3', mapId: 'woods', mapName: 'Woods', kappaRequired: true }),
    ];
    const result = getRecommendations(quests, new Map(), new Map(), 10);
    // q1とq2がcustomsを共有、各mapBatchCount=1
    const q1rec = result.topTasks.find((r) => r.quest.id === 'q1')!;
    const q3rec = result.topTasks.find((r) => r.quest.id === 'q3')!;
    expect(q1rec.mapBatchCount).toBe(1);
    expect(q3rec.mapBatchCount).toBe(0);
    // q1/q2はq3よりスコアが高いべき
    expect(q1rec.compositeScore).toBeGreaterThan(q3rec.compositeScore);
  });

  it('Kappaボーナスが反映される', () => {
    const quests = [
      makeQuest({ id: 'q1', mapId: null, kappaRequired: true }),
      makeQuest({ id: 'q2', mapId: null, kappaRequired: false }),
    ];
    const result = getRecommendations(quests, new Map(), new Map(), 10);
    const q1rec = result.topTasks.find((r) => r.quest.id === 'q1')!;
    const q2rec = result.topTasks.find((r) => r.quest.id === 'q2')!;
    expect(q1rec.compositeScore).toBeGreaterThan(q2rec.compositeScore);
    expect(q1rec.reasons).toContain('Kappa必須');
  });

  it('topTasksは最大5件', () => {
    const quests = Array.from({ length: 10 }, (_, i) =>
      makeQuest({ id: `q${i}`, kappaRequired: false, mapId: null }),
    );
    const result = getRecommendations(quests, new Map(), new Map(), 10);
    expect(result.topTasks.length).toBe(5);
  });

  it('mapBatchesは2件以上のマップのみ', () => {
    const quests = [
      makeQuest({ id: 'q1', mapId: 'customs', kappaRequired: false }),
      makeQuest({ id: 'q2', mapId: 'customs', kappaRequired: false }),
      makeQuest({ id: 'q3', mapId: 'woods', kappaRequired: false }),
    ];
    const result = getRecommendations(quests, new Map(), new Map(), 10);
    expect(result.mapBatches.length).toBe(1);
    expect(result.mapBatches[0].mapId).toBe('customs');
    expect(result.mapBatches[0].count).toBe(2);
  });

  it('mapNamesが渡されたらマップ名に使用される', () => {
    const quests = [
      makeQuest({ id: 'q1', mapId: 'customs', mapName: null, kappaRequired: false }),
      makeQuest({ id: 'q2', mapId: 'customs', mapName: null, kappaRequired: false }),
    ];
    const mapNames = new Map([['customs', 'カスタムズ']]);
    const result = getRecommendations(
      quests, new Map(), new Map(), 10, mapNames,
    );
    expect(result.mapBatches[0].mapName).toBe('カスタムズ');
  });

  it('理由テキストが正しく生成される', () => {
    // q1の後続はq2、q3とマップを共有
    const quests = [
      makeQuest({ id: 'q1', mapId: 'customs', mapName: 'Customs' }),
      makeQuest({ id: 'q2', prereqIds: ['q1'], minPlayerLevel: 99, mapId: null }),
      makeQuest({ id: 'q3', mapId: 'customs', mapName: 'Customs' }),
    ];
    const edges = new Map([['q2', ['q1']]]);
    const result = getRecommendations(quests, edges, new Map(), 1);
    const q1rec = result.topTasks.find((r) => r.quest.id === 'q1')!;
    expect(q1rec.reasons).toContain('Kappa後続タスク1件');
    expect(q1rec.reasons.some((r) => r.includes('Customs'))).toBe(true);
    expect(q1rec.reasons).toContain('Kappa必須');
  });
});
