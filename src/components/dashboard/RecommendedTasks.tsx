import { useState } from 'react';
import type { RecommendationResult } from '../../domain/recommendations';
import { useSelectionStore } from '../../stores/selectionStore';
import { useT } from '../../i18n';
import styles from './RecommendedTasks.module.css';

type ViewMode = 'priority' | 'map';

interface RecommendedTasksProps {
  recommendations: RecommendationResult;
}

export function RecommendedTasks({ recommendations }: RecommendedTasksProps) {
  const t = useT();
  const [view, setView] = useState<ViewMode>('priority');
  const setSelected = useSelectionStore((s) => s.setSelectedTaskId);

  const { topTasks, mapBatches } = recommendations;
  const hasContent = topTasks.length > 0 || mapBatches.length > 0;

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.sectionTitle}>{t.recommended_title}</div>
        {hasContent && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${view === 'priority' ? styles.tabActive : ''}`}
              onClick={() => setView('priority')}
            >
              {t.recommended_priority}
            </button>
            <button
              className={`${styles.tab} ${view === 'map' ? styles.tabActive : ''}`}
              onClick={() => setView('map')}
            >
              {t.recommended_by_map}
            </button>
          </div>
        )}
      </div>

      {!hasContent ? (
        <div className={styles.empty}>{t.recommended_empty}</div>
      ) : view === 'priority' ? (
        topTasks.map((rec) => (
          <div
            key={rec.quest.id}
            className={styles.taskRow}
            onClick={() => setSelected(rec.quest.id)}
          >
            {rec.quest.name}
            <span className={styles.traderHint}>({rec.quest.traderName})</span>
            {rec.isKappaRequired && <span className={styles.kappaHint}>K</span>}
            {rec.reasons.map((reason) => (
              <span key={reason} className={styles.reasonTag}>
                {reason}
              </span>
            ))}
          </div>
        ))
      ) : (
        mapBatches.map((group) => (
          <div key={group.mapId} className={styles.mapGroup}>
            <div className={styles.mapHeader}>
              {group.mapName} ({t.recommended_count.replace('{count}', String(group.count))})
            </div>
            {group.tasks.map((rec) => (
              <div
                key={rec.quest.id}
                className={styles.taskRow}
                onClick={() => setSelected(rec.quest.id)}
              >
                {rec.quest.name}
                <span className={styles.traderHint}>
                  ({rec.quest.traderName})
                </span>
                {rec.isKappaRequired && (
                  <span className={styles.kappaHint}>K</span>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
