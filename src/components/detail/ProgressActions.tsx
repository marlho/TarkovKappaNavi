import { useState, useMemo, useCallback } from 'react';
import type { QuestModel } from '../../api/types';
import type { TaskStatus } from '../../db/types';
import type { TaskLockState } from '../../domain/unlock';
import { collectIncompletePrereqs } from '../../domain/prereqTree';
import { updateTaskStatus, upsertProfile } from '../../db/operations';
import { useProfileStore } from '../../stores/profileStore';
import { useT } from '../../i18n';
import { CompleteConfirmModal } from './CompleteConfirmModal';
import { Modal } from '../ui/Modal';
import { LevelInput } from '../settings/LevelInput';
import styles from './ProgressActions.module.css';

interface ProgressActionsProps {
  taskId: string;
  status: TaskStatus;
  lockState: TaskLockState;
  prereqEdges: Map<string, string[]>;
  questMap: Map<string, QuestModel>;
  progressMap: Map<string, TaskStatus>;
  onStatusChange: () => void;
}

export function ProgressActions({
  taskId,
  status,
  lockState,
  prereqEdges,
  questMap,
  progressMap,
  onStatusChange,
}: ProgressActionsProps) {
  const t = useT();
  const [showModal, setShowModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<TaskStatus | null>(null);
  const isLocked = lockState !== 'unlocked';

  const currentLevel = useProfileStore((s) => s.currentLevel);
  const setLevel = useProfileStore((s) => s.setLevel);

  const quest = questMap.get(taskId);
  const minPlayerLevel = quest?.minPlayerLevel ?? 1;

  const incompletePrereqs = useMemo(() => {
    const ids = collectIncompletePrereqs(taskId, prereqEdges, progressMap);
    return ids.map((id) => ({
      taskId: id,
      name: questMap.get(id)?.name ?? id,
      status: (progressMap.get(id) ?? 'not_started') as TaskStatus,
    }));
  }, [taskId, prereqEdges, progressMap, questMap]);

  const handleAction = async (to: TaskStatus) => {
    if (lockState === 'level_locked') {
      setPendingAction(to);
      setShowLevelModal(true);
      return;
    }
    if (to === 'done' && incompletePrereqs.length > 0) {
      setShowModal(true);
      return;
    }
    await updateTaskStatus(taskId, to);
    onStatusChange();
  };

  const handleLevelChange = useCallback((newLevel: number) => {
    setLevel(newLevel);
    upsertProfile({ currentLevel: newLevel });
  }, [setLevel]);

  const handleLevelConfirm = async () => {
    setShowLevelModal(false);
    if (currentLevel < minPlayerLevel) return;
    if (pendingAction === 'done' && incompletePrereqs.length > 0) {
      setShowModal(true);
      return;
    }
    if (pendingAction) {
      await updateTaskStatus(taskId, pendingAction);
      onStatusChange();
    }
    setPendingAction(null);
  };

  const handleLevelModalClose = () => {
    setShowLevelModal(false);
    setPendingAction(null);
  };

  const handleModalClose = () => setShowModal(false);
  const handleModalConfirm = () => {
    setShowModal(false);
    onStatusChange();
  };

  return (
    <>
      <div className={styles.actions}>
        {status === 'not_started' && (
          <>
            <button className={styles.btnStart} disabled={isLocked} onClick={() => handleAction('in_progress')}
              title={isLocked ? (lockState === 'level_locked' ? t.progress_lock_level_hint : t.progress_lock_prereq_hint) : undefined}>
              {t.progress_btn_start}
            </button>
            <button className={styles.btnDone} onClick={() => handleAction('done')}
              title={lockState === 'level_locked' ? t.progress_lock_level_click_hint : undefined}>
              {t.progress_btn_done}
            </button>
          </>
        )}
        {status === 'in_progress' && (
          <>
            <button className={styles.btnDone} onClick={() => handleAction('done')}>
              {t.progress_btn_done}
            </button>
            <button className={styles.btnReset} onClick={() => handleAction('not_started')}>
              {t.progress_btn_reset}
            </button>
          </>
        )}
        {status === 'done' && (
          <button className={styles.btnReset} onClick={() => handleAction('not_started')}>
            {t.progress_btn_reset}
          </button>
        )}
      </div>

      {showLevelModal && (
        <Modal open={showLevelModal} onClose={handleLevelModalClose} title={t.progress_level_modal_title}>
          <div className={styles.levelModal}>
            <p className={styles.levelMessage} dangerouslySetInnerHTML={{ __html: t.progress_level_modal_text.replace('{minLevel}', String(minPlayerLevel)).replace('{currentLevel}', String(currentLevel)) }} />
            <div className={styles.levelInputRow}>
              <span className={styles.levelLabel}>{t.progress_level_change}</span>
              <LevelInput value={currentLevel} onChange={handleLevelChange} />
            </div>
            <div className={styles.levelActions}>
              <button className={styles.btnDone} onClick={handleLevelConfirm} disabled={currentLevel < minPlayerLevel}>
                {t.progress_level_continue}
              </button>
              <button className={styles.btnReset} onClick={handleLevelModalClose}>
                {t.common_cancel}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <CompleteConfirmModal
          taskId={taskId}
          taskName={questMap.get(taskId)?.name ?? taskId}
          incompletePrereqs={incompletePrereqs}
          onConfirm={handleModalConfirm}
          onCancel={handleModalClose}
        />
      )}
    </>
  );
}
