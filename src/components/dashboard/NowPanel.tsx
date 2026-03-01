import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTasks } from '../../api/hooks';
import { useProgressMap } from '../../hooks/useProgressMap';
import { useNowPinsStore } from '../../stores/nowPinsStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { removeNowPin } from '../../db/operations';
import { updateTaskStatus } from '../../db/operations';
import { collectIncompletePrereqs } from '../../domain/prereqTree';
import { useT } from '../../i18n';
import { Badge } from '../ui/Badge';
import { CompleteConfirmModal } from '../detail/CompleteConfirmModal';
import type { TaskStatus } from '../../db/types';
import styles from './NowPanel.module.css';

const MAX_PINS = 10;

export function NowPanel() {
  const t = useT();
  const pinIds = useNowPinsStore((s) => s.taskIds);
  const removePinStore = useNowPinsStore((s) => s.removePin);
  const setSelectedTaskId = useSelectionStore((s) => s.setSelectedTaskId);
  const { data: taskData } = useTasks();
  const { progressMap, refresh } = useProgressMap();

  const [completeTarget, setCompleteTarget] = useState<string | null>(null);

  const pinnedTasks = useMemo(() => {
    if (!taskData) return [];
    return pinIds
      .map((id) => {
        const quest = taskData.questMap.get(id);
        if (!quest) return null;
        const status = progressMap.get(id) ?? 'not_started';
        return { quest, status };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  }, [pinIds, taskData, progressMap]);

  const handleRemove = async (taskId: string) => {
    removePinStore(taskId);
    await removeNowPin(taskId);
  };

  const handleDone = (taskId: string) => {
    if (!taskData) return;
    const incomplete = collectIncompletePrereqs(taskId, taskData.prereqEdges, progressMap);
    if (incomplete.length > 0) {
      setCompleteTarget(taskId);
    } else {
      updateTaskStatus(taskId, 'done').then(() => {
        handleRemove(taskId);
        refresh();
      });
    }
  };

  const handleModalConfirm = () => {
    if (completeTarget) handleRemove(completeTarget);
    setCompleteTarget(null);
    refresh();
  };

  const completeModalPrereqs = useMemo(() => {
    if (!completeTarget || !taskData) return [];
    const ids = collectIncompletePrereqs(completeTarget, taskData.prereqEdges, progressMap);
    return ids.map((id) => ({
      taskId: id,
      name: taskData.questMap.get(id)?.name ?? id,
      status: (progressMap.get(id) ?? 'not_started') as TaskStatus,
    }));
  }, [completeTarget, taskData, progressMap]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Now</span>
        <span className={styles.sectionCount}>{pinnedTasks.length} / {MAX_PINS}</span>
      </div>

      {pinnedTasks.length === 0 ? (
        <div className={styles.emptyAll}>{t.now_pin_hint}</div>
      ) : (
        <div className={styles.cards}>
          {pinnedTasks.map(({ quest, status }) => (
            <div key={quest.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <button
                  className={styles.cardName}
                  onClick={() => setSelectedTaskId(quest.id)}
                >
                  {quest.name}
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(quest.id)}
                  aria-label={t.now_unpin}
                >
                  <X size={14} />
                </button>
              </div>
              <div className={styles.cardTrader}>
                {quest.traderName}
                {' '}
                <Badge variant={status === 'in_progress' ? 'inProgress' : 'default'}>
                  {status === 'in_progress' ? 'WIP' : status === 'not_started' ? t.now_not_started : status}
                </Badge>
              </div>
              {quest.objectives.length > 0 && (
                <div className={styles.cardObjectives}>
                  {quest.objectives.slice(0, 3).map((obj) => (
                    <div key={obj.id}>{obj.description}</div>
                  ))}
                  {quest.objectives.length > 3 && (
                    <div>{t.now_more_objectives.replace('{count}', String(quest.objectives.length - 3))}</div>
                  )}
                </div>
              )}
              {status !== 'done' && (
                <div className={styles.cardActions}>
                  <button className={styles.btnDone} onClick={() => handleDone(quest.id)}>
                    {t.progress_btn_done}
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>
      )}

      {completeTarget && taskData && (
        <CompleteConfirmModal
          taskId={completeTarget}
          taskName={taskData.questMap.get(completeTarget)?.name ?? completeTarget}
          incompletePrereqs={completeModalPrereqs}
          onConfirm={handleModalConfirm}
          onCancel={() => setCompleteTarget(null)}
        />
      )}
    </div>
  );
}
