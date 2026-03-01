import type { TaskStatus } from '../db/types';

/**
 * 未完了の前提タスクIDをDFSで再帰的に収集する。
 * 依存順（最深から）で返す。循環参照ガードあり。
 */
export function collectIncompletePrereqs(
  taskId: string,
  prereqEdges: Map<string, string[]>,
  progressMap: Map<string, TaskStatus>,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function dfs(id: string) {
    if (visited.has(id)) return; // 循環参照ガード
    visited.add(id);

    const prereqs = prereqEdges.get(id);
    if (!prereqs) return;

    for (const pid of prereqs) {
      const status = progressMap.get(pid) ?? 'not_started';
      if (status === 'done') continue;

      dfs(pid);
      // 再帰後に追加することで、最も深い前提タスクが先頭に来る
      if (!result.includes(pid)) {
        result.push(pid);
      }
    }
  }

  dfs(taskId);
  return result;
}

export interface PrereqNode {
  taskId: string;
  name: string;
  status: TaskStatus;
  children: PrereqNode[];
}

/**
 * 前提タスクをUI表示用のツリー構造として構築する。
 * 未完了の前提のみ含む。
 */
export function buildPrereqTree(
  taskId: string,
  prereqEdges: Map<string, string[]>,
  progressMap: Map<string, TaskStatus>,
  nameMap: Map<string, string>,
): PrereqNode[] {
  const visited = new Set<string>();

  function build(id: string): PrereqNode[] {
    const prereqs = prereqEdges.get(id);
    if (!prereqs) return [];

    const nodes: PrereqNode[] = [];
    for (const pid of prereqs) {
      if (visited.has(pid)) continue; // 循環参照ガード
      visited.add(pid);

      const status = progressMap.get(pid) ?? 'not_started';
      nodes.push({
        taskId: pid,
        name: nameMap.get(pid) ?? pid,
        status,
        children: status === 'done' ? [] : build(pid),
      });
    }
    return nodes;
  }

  return build(taskId);
}
