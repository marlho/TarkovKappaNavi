import type { EnrichedTask } from '../../domain/taskFilters';
import { useT } from '../../i18n';
import { Badge } from '../ui/Badge';
import styles from './TaskCard.module.css';

const statusVariant: Record<string, 'done' | 'inProgress' | 'locked' | 'default'> = {
  not_started: 'default',
  in_progress: 'inProgress',
  done: 'done',
};

interface TaskCardProps {
  task: EnrichedTask;
  isSelected: boolean;
  onClick: () => void;
}

export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  const t = useT();
  const statusLabel: Record<string, string> = {
    not_started: t.status_not_started,
    in_progress: t.status_in_progress,
    done: t.status_done,
  };
  const { quest, status, lockState } = task;
  const isLocked = lockState !== 'unlocked';

  return (
    <div
      className={[
        styles.card,
        isSelected ? styles.selected : '',
        isLocked ? styles.locked : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <div className={styles.info}>
        <div className={styles.name}>{quest.name}</div>
        <div className={styles.meta}>
          <span>{quest.traderName}</span>
          {quest.mapName && <span>{quest.mapName}</span>}
        </div>
      </div>

      <div className={styles.badges}>
        {quest.kappaRequired && <span className={styles.kappaIcon}>K</span>}
        <span className={styles.level}>Lv.{quest.minPlayerLevel}</span>
        {isLocked ? (
          <Badge variant="locked">
            {lockState === 'level_locked' ? t.taskcard_lock_level : t.taskcard_lock_prereq}
          </Badge>
        ) : (
          <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
        )}
      </div>
    </div>
  );
}
