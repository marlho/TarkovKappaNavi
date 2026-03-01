import { Helmet } from 'react-helmet-async';
import { useTasks } from '../../api/hooks';
import { useProfileStore } from '../../stores/profileStore';
import { useKappaProgress } from '../../hooks/useKappaProgress';
import { useNextUnlocks } from '../../hooks/useNextUnlocks';
import { useRecommendedTasks } from '../../hooks/useRecommendedTasks';
import { useT } from '../../i18n';
import { Skeleton } from '../ui/Skeleton';
import { KappaProgressSection } from './KappaProgressSection';
import { NowPanel } from './NowPanel';
import { RecommendedTasks } from './RecommendedTasks';
import { NextUnlockPreview } from './NextUnlockPreview';
import styles from './DashboardPage.module.css';

function DashboardSkeleton() {
  return (
    <>
      {/* KappaProgressSection skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton height="12px" borderRadius="4px" />
        <Skeleton width="120px" height="0.85rem" />
      </div>

      {/* NowPanel skeleton - 3 cards */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height="80px" borderRadius="6px" />
        ))}
      </div>

      {/* NextUnlockPreview skeleton */}
      <Skeleton lines={4} />
    </>
  );
}

export function DashboardPage() {
  const t = useT();
  const { isLoading, error } = useTasks();
  const playerLevel = useProfileStore((s) => s.currentLevel);
  const { stats, byTrader } = useKappaProgress();
  const { groups } = useNextUnlocks();
  const { recommendations } = useRecommendedTasks();

  if (error) return <div className={styles.page} style={{ color: 'var(--accent-red)' }}>API エラー: {String(error)}</div>;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.dashboard_meta_title}</title>
        <meta name="description" content={t.dashboard_meta_desc} />
      </Helmet>
      <h1 className={styles.pageTitle}>{t.dashboard_page_title}</h1>
      <div className={styles.levelInfo}>Lv. {playerLevel}</div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {stats && <KappaProgressSection stats={stats} byTrader={byTrader} />}
          <NowPanel />
          <RecommendedTasks recommendations={recommendations} />
          <NextUnlockPreview groups={groups} />
        </>
      )}
    </div>
  );
}
