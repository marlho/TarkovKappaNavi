import { describe, it, expect } from 'vitest';
import { collectIncompletePrereqs, buildPrereqTree } from '../prereqTree';
import type { TaskStatus } from '../../db/types';

describe('collectIncompletePrereqs', () => {
  it('前提タスクがないタスクの場合は空を返す', () => {
    const edges = new Map<string, string[]>();
    const result = collectIncompletePrereqs('q1', edges, new Map());
    expect(result).toEqual([]);
  });

  it('直接の未完了前提タスクを収集する', () => {
    const edges = new Map([['q3', ['q1', 'q2']]]);
    const pm = new Map<string, TaskStatus>([['q1', 'not_started']]);
    const result = collectIncompletePrereqs('q3', edges, pm);
    expect(result).toContain('q1');
    expect(result).toContain('q2');
  });

  it('完了済みの前提タスクをスキップする', () => {
    const edges = new Map([['q3', ['q1', 'q2']]]);
    const pm = new Map<string, TaskStatus>([
      ['q1', 'done'],
      ['q2', 'not_started'],
    ]);
    const result = collectIncompletePrereqs('q3', edges, pm);
    expect(result).toEqual(['q2']);
  });

  it('再帰的に収集する（最深優先）', () => {
    // q3 → q2 → q1
    const edges = new Map([
      ['q3', ['q2']],
      ['q2', ['q1']],
    ]);
    const result = collectIncompletePrereqs('q3', edges, new Map());
    expect(result).toEqual(['q1', 'q2']);
  });

  it('循環参照を無限ループなしで処理する', () => {
    // q1 → q2 → q1（循環）
    const edges = new Map([
      ['q1', ['q2']],
      ['q2', ['q1']],
    ]);
    const result = collectIncompletePrereqs('q1', edges, new Map());
    // 例外を投げず、q2を返すべき
    expect(result).toContain('q2');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('ダイヤモンド依存を重複なしで処理する', () => {
    //   q4
    //  / \
    // q2  q3
    //  \ /
    //   q1
    const edges = new Map([
      ['q4', ['q2', 'q3']],
      ['q2', ['q1']],
      ['q3', ['q1']],
    ]);
    const result = collectIncompletePrereqs('q4', edges, new Map());
    const unique = new Set(result);
    expect(unique.size).toBe(result.length); // 重複なし
    expect(result).toContain('q1');
    expect(result).toContain('q2');
    expect(result).toContain('q3');
  });
});

describe('buildPrereqTree', () => {
  it('未完了の前提タスクでツリーを構築する', () => {
    const edges = new Map([
      ['q3', ['q2']],
      ['q2', ['q1']],
    ]);
    const nameMap = new Map([
      ['q1', 'Quest 1'],
      ['q2', 'Quest 2'],
      ['q3', 'Quest 3'],
    ]);
    const tree = buildPrereqTree('q3', edges, new Map(), nameMap);
    expect(tree).toHaveLength(1);
    expect(tree[0].taskId).toBe('q2');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].taskId).toBe('q1');
  });

  it('完了済みの前提タスクには再帰しない', () => {
    const edges = new Map([
      ['q3', ['q2']],
      ['q2', ['q1']],
    ]);
    const pm = new Map<string, TaskStatus>([['q2', 'done']]);
    const nameMap = new Map([
      ['q1', 'Quest 1'],
      ['q2', 'Quest 2'],
    ]);
    const tree = buildPrereqTree('q3', edges, pm, nameMap);
    expect(tree).toHaveLength(1);
    expect(tree[0].status).toBe('done');
    expect(tree[0].children).toHaveLength(0);
  });
});
