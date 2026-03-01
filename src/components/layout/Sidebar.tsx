import { useMemo } from 'react';
import { useKappaProgress } from '../../hooks/useKappaProgress';
import { useTasks } from '../../api/hooks';
import { useProgressMap } from '../../hooks/useProgressMap';
import { useT } from '../../i18n';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onNavigate?: () => void;
  isLoading?: boolean;
}

export function Sidebar({ isLoading }: SidebarProps) {
  const t = useT();
  const { stats, byTrader } = useKappaProgress();
  const { data: taskData } = useTasks();
  const { progressMap } = useProgressMap();

  const mapStats = useMemo(() => {
    if (!taskData) return [];
    const counts = new Map<string, { name: string; remaining: number }>();
    for (const q of taskData.quests) {
      const mapName = q.mapName ?? 'Any';
      const mapId = q.mapId ?? '_any';
      const status = progressMap.get(q.id) ?? 'not_started';
      if (status === 'done') continue;
      const entry = counts.get(mapId) ?? { name: mapName, remaining: 0 };
      entry.remaining++;
      counts.set(mapId, entry);
    }
    return Array.from(counts.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.remaining - a.remaining);
  }, [taskData, progressMap]);

  return (
    <aside className={styles.sidebar}>
      {/* Kappa compact */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.sidebar_kappa_progress}</div>
        {isLoading ? (
          <>
            <Skeleton height="8px" borderRadius="4px" />
            <Skeleton width="80px" height="0.75rem" />
          </>
        ) : stats ? (
          <>
            <ProgressBar value={stats.percent} />
            <div className={styles.statLine}>{stats.done}/{stats.total} ({stats.percent}%)</div>
          </>
        ) : (
          <div className={styles.placeholder}>-- / --</div>
        )}
      </div>

      {/* Trader progress */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.sidebar_traders}</div>
        {isLoading ? (
          <div className={styles.traderList}>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className={styles.traderRow}>
                <Skeleton width="72px" height="0.75rem" />
                <div className={styles.traderBar}>
                  <Skeleton height="8px" borderRadius="4px" />
                </div>
                <Skeleton width="40px" height="0.75rem" />
              </div>
            ))}
          </div>
        ) : byTrader.length > 0 ? (
          <div className={styles.traderList}>
            {byTrader.map((t) => (
              <div key={t.traderId} className={styles.traderRow}>
                <span className={styles.traderName}>{t.traderName}</span>
                <div className={styles.traderBar}>
                  <ProgressBar value={t.percent} />
                </div>
                <span className={styles.traderStat}>{t.done}/{t.total}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.placeholder}>{t.sidebar_preparing}</div>
        )}
      </div>

      {/* Map remaining */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.sidebar_map_remaining}</div>
        {isLoading ? (
          <div className={styles.mapList}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={styles.mapRow}>
                <Skeleton width="60%" height="0.75rem" />
                <Skeleton width="24px" height="0.75rem" />
              </div>
            ))}
          </div>
        ) : mapStats.length > 0 ? (
          <div className={styles.mapList}>
            {mapStats.map((m) => (
              <div key={m.id} className={styles.mapRow}>
                <span className={styles.mapName}>{m.name}</span>
                <span className={styles.mapCount}>{m.remaining}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.placeholder}>--</div>
        )}
      </div>
    </aside>
  );
}
