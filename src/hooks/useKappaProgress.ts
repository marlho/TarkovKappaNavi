import { useMemo } from 'react';
import { useTasks } from '../api/hooks';
import { useProgressMap } from './useProgressMap';
import {
  calcKappaProgress,
  calcKappaByTrader,
  type KappaStats,
  type TraderKappaStats,
} from '../domain/kappaProgress';

export function useKappaProgress(): {
  stats: KappaStats | null;
  byTrader: TraderKappaStats[];
  isLoading: boolean;
} {
  const { data: taskData, isLoading: tasksLoading } = useTasks();
  const { progressMap, loading: progressLoading } = useProgressMap();

  const stats = useMemo(() => {
    if (!taskData) return null;
    return calcKappaProgress(taskData.quests, progressMap);
  }, [taskData, progressMap]);

  const byTrader = useMemo(() => {
    if (!taskData) return [];
    return calcKappaByTrader(taskData.quests, progressMap);
  }, [taskData, progressMap]);

  return { stats, byTrader, isLoading: tasksLoading || progressLoading };
}
