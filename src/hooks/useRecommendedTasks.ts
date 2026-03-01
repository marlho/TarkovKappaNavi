import { useMemo } from 'react';
import { useTasks, useMapsEn } from '../api/hooks';
import { useProfileStore } from '../stores/profileStore';
import { useProgressMap } from './useProgressMap';
import {
  getRecommendations,
  type RecommendationResult,
} from '../domain/recommendations';

export function useRecommendedTasks(): {
  recommendations: RecommendationResult;
  isLoading: boolean;
} {
  const { data: taskData, isLoading: tasksLoading } = useTasks();
  const { data: maps, isLoading: mapsLoading } = useMapsEn();
  const { progressMap, loading: progressLoading } = useProgressMap();
  const playerLevel = useProfileStore((s) => s.currentLevel);

  const mapNames = useMemo(() => {
    if (!maps) return undefined;
    const m = new Map<string, string>();
    for (const map of maps) {
      m.set(map.id, map.name);
    }
    return m;
  }, [maps]);

  const recommendations = useMemo(() => {
    if (!taskData) return { topTasks: [], mapBatches: [] };
    return getRecommendations(
      taskData.quests,
      taskData.prereqEdges,
      progressMap,
      playerLevel,
      mapNames,
    );
  }, [taskData, progressMap, playerLevel, mapNames]);

  return {
    recommendations,
    isLoading: tasksLoading || mapsLoading || progressLoading,
  };
}
