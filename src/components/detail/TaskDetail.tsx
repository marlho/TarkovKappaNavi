import { useMemo } from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { QuestModel, NormalizedTasks } from '../../api/types';
import type { TaskStatus } from '../../db/types';
import type { TaskLockState } from '../../domain/unlock';
import { useSelectionStore } from '../../stores/selectionStore';
import { useNowPinsStore } from '../../stores/nowPinsStore';
import { addNowPin, removeNowPin as removeNowPinDb } from '../../db/operations';
import { useT } from '../../i18n';
import { Badge } from '../ui/Badge';
import { PrereqTreeView } from './PrereqTreeView';
import { ProgressActions } from './ProgressActions';
import { NotesEditor } from './NotesEditor';
import styles from './TaskDetail.module.css';

interface TaskDetailProps {
  quest: QuestModel;
  status: TaskStatus;
  lockState: TaskLockState;
  taskData: NormalizedTasks;
  progressMap: Map<string, TaskStatus>;
  onStatusChange: () => void;
}

function statusToBadgeVariant(status: TaskStatus) {
  if (status === 'done') return 'done' as const;
  if (status === 'in_progress') return 'inProgress' as const;
  return 'default' as const;
}

export function TaskDetail({
  quest,
  status,
  lockState,
  taskData,
  progressMap,
  onStatusChange,
}: TaskDetailProps) {
  const t = useT();
  const statusLabel: Record<TaskStatus, string> = {
    not_started: t.status_not_started,
    in_progress: t.status_in_progress,
    done: t.status_done,
  };
  const setSelected = useSelectionStore((s) => s.setSelectedTaskId);
  const pinIds = useNowPinsStore((s) => s.taskIds);
  const addPin = useNowPinsStore((s) => s.addPin);
  const removePin = useNowPinsStore((s) => s.removePin);

  const isPinned = pinIds.includes(quest.id);
  const canPin = pinIds.length < 10;

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of taskData.quests) m.set(q.id, q.name);
    return m;
  }, [taskData.quests]);

  const lockReasons = useMemo(() => {
    const reasons: string[] = [];
    if (lockState === 'level_locked') {
      reasons.push(t.detail_lock_level.replace('{level}', String(quest.minPlayerLevel)));
    }
    if (lockState === 'prereq_locked') {
      const prereqs = taskData.prereqEdges.get(quest.id) ?? [];
      const incomplete = prereqs
        .filter((pid) => {
          const s = progressMap.get(pid) ?? 'not_started';
          return s !== 'done';
        })
        .map((pid) => nameMap.get(pid) ?? pid);
      if (incomplete.length > 0) {
        reasons.push(t.detail_lock_prereq.replace('{names}', incomplete.join(', ')));
      }
    }
    return reasons;
  }, [lockState, quest, taskData.prereqEdges, progressMap, nameMap]);

  const handleTogglePin = async () => {
    if (isPinned) {
      removePin(quest.id);
      await removeNowPinDb(quest.id);
    } else if (canPin) {
      addPin(quest.id);
      await addNowPin(quest.id);
    }
  };

  return (
    <div className={styles.detail}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.name}>{quest.name}</div>
          <div className={styles.trader}>{quest.traderName}</div>
        </div>
        <button
          className={styles.closeBtn}
          onClick={() => setSelected(null)}
          aria-label={t.detail_close}
        >
          <X size={16} />
        </button>
      </div>

      {/* Thumbnail */}
      {quest.imageLink && (
        <img
          src={quest.imageLink}
          alt={quest.name}
          className={styles.thumbnail}
        />
      )}

      {/* Status + Kappa badge */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Status:</span>
          <Badge variant={statusToBadgeVariant(status)}>{statusLabel[status]}</Badge>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Lv:</span>
          <span>{quest.minPlayerLevel}</span>
        </div>
        {quest.mapName && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Map:</span>
            <span>{quest.mapName}</span>
          </div>
        )}
        {quest.kappaRequired && <Badge variant="kappa">Kappa</Badge>}
      </div>

      {/* Lock warning */}
      {lockState !== 'unlocked' && lockReasons.length > 0 && (
        <div className={styles.lockWarning}>
          {lockReasons.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}

      {/* Objectives */}
      {quest.objectives.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t.detail_objectives}</div>
          <div className={styles.objectives}>
            {quest.objectives.map((obj) => (
              <div key={obj.id} className={styles.objective}>
                <span className={styles.objType}>{obj.type}</span>
                <span className={styles.objDesc}>{obj.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wiki links */}
      {quest.wikiLink && (
        <div className={styles.section}>
          <div className={styles.wikiLinks}>
            <a
              className={styles.wikiLink}
              href={quest.wikiLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Wiki <ExternalLink size={12} />
            </a>
            <a
              className={styles.wikiLink}
              href={`https://wikiwiki.jp/eft/${encodeURIComponent(quest.traderName)}/${encodeURIComponent(quest.name)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.detail_wiki_ja} <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Prereq tree */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.detail_prereqs}</div>
        <PrereqTreeView
          taskId={quest.id}
          prereqEdges={taskData.prereqEdges}
          nameMap={nameMap}
          progressMap={progressMap}
        />
      </div>

      {/* Actions */}
      <div className={styles.section}>
        <ProgressActions
          taskId={quest.id}
          status={status}
          lockState={lockState}
          prereqEdges={taskData.prereqEdges}
          questMap={taskData.questMap}
          progressMap={progressMap}
          onStatusChange={onStatusChange}
        />
      </div>

      {/* Pin to Now */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.detail_now_pin}</div>
        <div className={styles.pinHint}>
          {t.detail_now_pin_hint}
        </div>
        <button
          onClick={handleTogglePin}
          disabled={!isPinned && !canPin}
          title={!isPinned && !canPin ? t.detail_now_pin_max : undefined}
        >
          {isPinned ? t.detail_unpin : t.detail_pin}
        </button>
      </div>

      {/* Notes */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.detail_notes}</div>
        <NotesEditor taskId={quest.id} />
      </div>
    </div>
  );
}
