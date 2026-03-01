import { Helmet } from 'react-helmet-async';
import { useState, useRef } from 'react';
import { useFilterStore } from '../../stores/filterStore';
import { useEnrichedTasks } from '../../hooks/useUnlockedTasks';
import { useTasks } from '../../api/hooks';
import { useT } from '../../i18n';
import { Skeleton } from '../ui/Skeleton';
import { TaskFilterBar } from './TaskFilterBar';
import { ViewTabs, type ViewMode } from './ViewTabs';
import { TaskListView } from './TaskListView';
import { TaskFlowView } from './TaskFlowView';
import styles from './TasksPage.module.css';

function TaskListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} height="48px" borderRadius="6px" />
      ))}
    </div>
  );
}

export function TasksPage() {
  const t = useT();
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const filters = useFilterStore();
  const { tasks, isLoading } = useEnrichedTasks(filters);
  const { data: taskData } = useTasks();
  const fullscreenRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.tasks_meta_title}</title>
        <meta name="description" content={t.tasks_meta_desc} />
      </Helmet>
      <h1 className={styles.pageTitle}>{t.tasks_page_title}</h1>
      <div ref={fullscreenRef} className={styles.contentArea}>
        <TaskFilterBar />
        <ViewTabs active={viewMode} onChange={setViewMode} />
        {isLoading ? (
          <TaskListSkeleton />
        ) : viewMode === 'list' ? (
          <TaskListView tasks={tasks} />
        ) : (
          <TaskFlowView
            tasks={tasks}
            prereqEdges={taskData?.prereqEdges ?? new Map()}
            fullscreenRef={fullscreenRef}
          />
        )}
      </div>
    </div>
  );
}
