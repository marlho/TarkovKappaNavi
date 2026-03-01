import type { QuestModel } from '../api/types';
import type { TaskStatus } from '../db/types';
import { isTaskUnlocked } from './unlock';
import { getLang } from '../i18n';
import ja from '../i18n/ja';
import en from '../i18n/en';

export interface TaskRecommendation {
  quest: QuestModel;
  compositeScore: number;
  downstreamCount: number;
  mapBatchCount: number;
  isKappaRequired: boolean;
  reasons: string[];
}

export interface MapBatchGroup {
  mapId: string;
  mapName: string;
  tasks: TaskRecommendation[];
  count: number;
}

export interface RecommendationResult {
  topTasks: TaskRecommendation[];
  mapBatches: MapBatchGroup[];
}

/**
 * prereqEdges (taskId→前提タスクID[]) を反転して taskId→依存タスクID[] のマップを構築
 */
export function buildReverseDependencyGraph(
  prereqEdges: Map<string, string[]>,
): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const [taskId, prereqs] of prereqEdges) {
    for (const prereqId of prereqs) {
      const list = reverse.get(prereqId) ?? [];
      list.push(taskId);
      reverse.set(prereqId, list);
    }
  }
  return reverse;
}

/**
 * BFSで推移的後続タスク数をカウント（done除外、サイクルガード付き）
 */
export function countDownstreamTasks(
  taskId: string,
  reverseDeps: Map<string, string[]>,
  progressMap: Map<string, TaskStatus>,
  kappaTaskIds?: Set<string>,
): number {
  const visited = new Set<string>();
  const queue: string[] = [taskId];
  visited.add(taskId);

  let count = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseDeps.get(current) ?? [];
    for (const dep of dependents) {
      if (visited.has(dep)) continue;
      visited.add(dep);
      const status = progressMap.get(dep) ?? 'not_started';
      if (status === 'done') continue;
      if (!kappaTaskIds || kappaTaskIds.has(dep)) {
        count++;
      }
      queue.push(dep);
    }
  }
  return count;
}

/**
 * quest.mapId + objectives[].mapIds の重複排除セット
 */
export function getTaskMapIds(quest: QuestModel): string[] {
  const set = new Set<string>();
  if (quest.mapId) set.add(quest.mapId);
  for (const obj of quest.objectives) {
    for (const mapId of obj.mapIds) {
      set.add(mapId);
    }
  }
  return Array.from(set);
}

/**
 * おすすめタスクを算出する。
 *
 * スコアリング:
 *   後続インパクト (0.50) + マップバッチ (0.30) + Kappa必須 (0.20)
 */
export function getRecommendations(
  quests: QuestModel[],
  prereqEdges: Map<string, string[]>,
  progressMap: Map<string, TaskStatus>,
  playerLevel: number,
  mapNames?: Map<string, string>,
): RecommendationResult {
  // アンロック済みかつ未完了のタスクを抽出
  const candidates = quests.filter((q) => {
    const status = progressMap.get(q.id) ?? 'not_started';
    if (status === 'done') return false;
    return isTaskUnlocked(q, playerLevel, progressMap);
  });

  if (candidates.length === 0) {
    return { topTasks: [], mapBatches: [] };
  }

  const reverseDeps = buildReverseDependencyGraph(prereqEdges);

  // KappaタスクIDのセット
  const kappaTaskIds = new Set(quests.filter((q) => q.kappaRequired).map((q) => q.id));

  // マップごとのKappa候補タスク数を集計
  const mapTaskCounts = new Map<string, number>();
  for (const q of candidates) {
    if (!q.kappaRequired) continue;
    for (const mapId of getTaskMapIds(q)) {
      mapTaskCounts.set(mapId, (mapTaskCounts.get(mapId) ?? 0) + 1);
    }
  }

  // 各候補のスコア要素を算出
  const recs: TaskRecommendation[] = candidates.map((q) => {
    const downstreamCount = countDownstreamTasks(q.id, reverseDeps, progressMap, kappaTaskIds);

    // 同マップの他の利用可能タスク数（最大のマップで計算）
    const mapIds = getTaskMapIds(q);
    let mapBatchCount = 0;
    for (const mapId of mapIds) {
      const others = (mapTaskCounts.get(mapId) ?? 0) - 1;
      if (others > mapBatchCount) mapBatchCount = others;
    }

    return {
      quest: q,
      compositeScore: 0,
      downstreamCount,
      mapBatchCount,
      isKappaRequired: q.kappaRequired,
      reasons: [],
    };
  });

  // 正規化して重み付き合算
  const maxDownstream = Math.max(...recs.map((r) => r.downstreamCount), 1);
  const maxMapBatch = Math.max(...recs.map((r) => r.mapBatchCount), 1);

  // 理由テキスト用の辞書を取得
  const dict = getLang() === 'ja' ? ja : en;

  for (const rec of recs) {
    const downstreamNorm = rec.downstreamCount / maxDownstream;
    const mapBatchNorm = rec.mapBatchCount / maxMapBatch;
    const kappaNorm = rec.isKappaRequired ? 1 : 0;

    rec.compositeScore =
      downstreamNorm * 0.5 + mapBatchNorm * 0.3 + kappaNorm * 0.2;

    // 理由テキストを生成
    if (rec.downstreamCount > 0) {
      rec.reasons.push(dict.rec_kappa_downstream.replace('{count}', String(rec.downstreamCount)));
    }
    if (rec.mapBatchCount > 0) {
      let bestMapId = '';
      let bestCount = 0;
      for (const mapId of getTaskMapIds(rec.quest)) {
        const others = (mapTaskCounts.get(mapId) ?? 0) - 1;
        if (others > bestCount) {
          bestCount = others;
          bestMapId = mapId;
        }
      }
      const name =
        mapNames?.get(bestMapId) ?? rec.quest.mapName ?? bestMapId;
      rec.reasons.push(dict.rec_map_batch.replace('{map}', name).replace('{count}', String(rec.mapBatchCount + 1)));
    }
    if (rec.isKappaRequired) {
      rec.reasons.push(dict.rec_kappa_required);
    }
  }

  // スコア降順ソート → top5
  recs.sort((a, b) => b.compositeScore - a.compositeScore);
  const topTasks = recs.slice(0, 5);

  // マップ別グループ（2件以上）
  const mapGroups = new Map<string, TaskRecommendation[]>();
  for (const rec of recs) {
    for (const mapId of getTaskMapIds(rec.quest)) {
      const list = mapGroups.get(mapId) ?? [];
      list.push(rec);
      mapGroups.set(mapId, list);
    }
  }

  const mapBatches: MapBatchGroup[] = [];
  for (const [mapId, tasks] of mapGroups) {
    if (tasks.length < 2) continue;
    const name =
      mapNames?.get(mapId) ?? tasks[0]?.quest.mapName ?? mapId;
    mapBatches.push({
      mapId,
      mapName: name,
      tasks: [...tasks].sort((a, b) => b.compositeScore - a.compositeScore),
      count: tasks.length,
    });
  }
  mapBatches.sort((a, b) => b.count - a.count);

  return { topTasks, mapBatches };
}
