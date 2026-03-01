import { useEffect, useRef } from 'react';
import { useTasks } from '../api/hooks';
import { useProgressMap } from './useProgressMap';
import { useProfileStore } from '../stores/profileStore';
import { findAutoStartCandidates } from '../domain/unlock';
import { batchAutoStart } from '../db/operations';

/**
 * progressMap変更を監視し、自動Start候補を検出してバッチ実行する。
 * 設定がOFFの場合は何もしない。
 */
export function useAutoStart() {
  const { data: taskData } = useTasks();
  const { progressMap, loading } = useProgressMap();
  const autoStartEnabled = useProfileStore((s) => s.autoStartUnlocked);
  const playerLevel = useProfileStore((s) => s.currentLevel);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!autoStartEnabled || !taskData || loading) return;

    const candidates = findAutoStartCandidates(
      taskData.quests,
      playerLevel,
      progressMap,
    );

    // 前回処理済みの候補を除外（無限ループ防止）
    const newCandidates = candidates.filter((id) => !processedRef.current.has(id));
    if (newCandidates.length === 0) return;

    // 処理済みとして記録
    for (const id of newCandidates) {
      processedRef.current.add(id);
    }

    batchAutoStart(newCandidates);
  }, [autoStartEnabled, taskData, progressMap, playerLevel, loading]);
}
