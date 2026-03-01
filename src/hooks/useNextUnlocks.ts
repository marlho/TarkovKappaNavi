import { useMemo } from 'react';
import { useTasks } from '../api/hooks';
import { useProfileStore } from '../stores/profileStore';
import { useProgressMap } from './useProgressMap';
import { getNextUnlocks, type NextUnlockGroup } from '../domain/nextUnlock';

export function useNextUnlocks(levelRange = 5): {
  groups: NextUnlockGroup[];
  isLoading: boolean;
} {
  const { data: taskData, isLoading: tasksLoading } = useTasks();
  const { progressMap, loading: progressLoading } = useProgressMap();
  const playerLevel = useProfileStore((s) => s.currentLevel);

  const groups = useMemo(() => {
    if (!taskData) return [];
    return getNextUnlocks(taskData.quests, playerLevel, progressMap, levelRange);
  }, [taskData, playerLevel, progressMap, levelRange]);

  return { groups, isLoading: tasksLoading || progressLoading };
}
