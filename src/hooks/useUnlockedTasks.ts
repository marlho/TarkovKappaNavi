import { useMemo } from 'react';
import { useTasks } from '../api/hooks';
import { useProfileStore } from '../stores/profileStore';
import { useProgressMap } from './useProgressMap';
import { enrichTasks, filterTasks, type FilterParams, type EnrichedTask } from '../domain/taskFilters';

/**
 * ロック状態とステータスを付与したタスク一覧を返す。オプションでフィルタ適用可能。
 */
export function useEnrichedTasks(filters?: FilterParams): {
  tasks: EnrichedTask[];
  isLoading: boolean;
} {
  const { data: taskData, isLoading: tasksLoading } = useTasks();
  const { progressMap, loading: progressLoading } = useProgressMap();
  const playerLevel = useProfileStore((s) => s.currentLevel);

  const tasks = useMemo(() => {
    if (!taskData) return [];
    const enriched = enrichTasks(taskData.quests, playerLevel, progressMap);
    if (!filters) return enriched;
    return filterTasks(enriched, filters);
  }, [taskData, playerLevel, progressMap, filters]);

  return { tasks, isLoading: tasksLoading || progressLoading };
}
