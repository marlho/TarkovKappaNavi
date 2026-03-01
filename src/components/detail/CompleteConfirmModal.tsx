import { useState } from 'react';
import type { TaskStatus } from '../../db/types';
import { bulkCompleteWithPrereqs, updateTaskStatus } from '../../db/operations';
import { useT } from '../../i18n';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import styles from './CompleteConfirmModal.module.css';


interface PrereqEntry {
  taskId: string;
  name: string;
  status: TaskStatus;
}

interface CompleteConfirmModalProps {
  taskId: string;
  taskName: string;
  incompletePrereqs: PrereqEntry[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function CompleteConfirmModal({
  taskId,
  taskName,
  incompletePrereqs,
  onConfirm,
  onCancel,
}: CompleteConfirmModalProps) {
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(incompletePrereqs.map((p) => p.taskId)),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkComplete = async () => {
    const prereqIds = incompletePrereqs
      .filter((p) => selected.has(p.taskId))
      .map((p) => p.taskId);
    await bulkCompleteWithPrereqs(taskId, prereqIds);
    onConfirm();
  };

  const handleOnlyThis = async () => {
    await updateTaskStatus(taskId, 'done');
    onConfirm();
  };

  const statusLabel: Record<TaskStatus, string> = {
    not_started: t.status_not_started,
    in_progress: t.status_in_progress,
    done: t.status_done,
  };

  return (
    <Modal open title={t.complete_confirm_title.replace('{name}', taskName)} onClose={onCancel}>
      <div className={styles.description}>
        {t.complete_confirm_desc}
      </div>
      <div className={styles.prereqList}>
        {incompletePrereqs.map((p) => (
          <label key={p.taskId} className={styles.prereqItem}>
            <input
              type="checkbox"
              checked={selected.has(p.taskId)}
              onChange={() => toggle(p.taskId)}
            />
            <span className={styles.prereqName}>{p.name}</span>
            <Badge variant={p.status === 'in_progress' ? 'inProgress' : 'locked'}>
              {statusLabel[p.status]}
            </Badge>
          </label>
        ))}
      </div>
      <div className={styles.buttons}>
        <button className={styles.btnPrimary} onClick={handleBulkComplete}>
          {t.complete_bulk}
        </button>
        <button className={styles.btnTertiary} onClick={handleOnlyThis}>
          {t.complete_only_this}
        </button>
      </div>
    </Modal>
  );
}
