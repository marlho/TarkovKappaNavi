import type { EnrichedTask } from '../../domain/taskFilters';
import { useSelectionStore } from '../../stores/selectionStore';
import { useT } from '../../i18n';
import { TaskCard } from './TaskCard';
import styles from './TaskListView.module.css';

interface TaskListViewProps {
  tasks: EnrichedTask[];
}

export function TaskListView({ tasks }: TaskListViewProps) {
  const t = useT();
  const selectedId = useSelectionStore((s) => s.selectedTaskId);
  const setSelected = useSelectionStore((s) => s.setSelectedTaskId);

  if (tasks.length === 0) {
    return <div className={styles.empty}>{t.tasklist_empty}</div>;
  }

  return (
    <div>
      <div className={styles.count}>{t.tasklist_count.replace('{count}', String(tasks.length))}</div>
      <div className={styles.list}>
        {tasks.map((t) => (
          <TaskCard
            key={t.quest.id}
            task={t}
            isSelected={selectedId === t.quest.id}
            onClick={() => setSelected(selectedId === t.quest.id ? null : t.quest.id)}
          />
        ))}
      </div>
    </div>
  );
}
