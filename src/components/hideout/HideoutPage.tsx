import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';
import { useHideoutStations } from '../../api/hooks';
import { useHideoutProgressMap } from '../../hooks/useHideoutProgressMap';
import { useHideoutStore } from '../../stores/hideoutStore';
import { useT } from '../../i18n';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';
import { HideoutGrid } from './HideoutGrid';
import { HideoutSummary } from './HideoutSummary';
import { StationDetailPanel } from './StationDetailPanel';
import { BuildableSummary } from './BuildableSummary';
import { useFakeProgress } from '../../hooks/useFakeProgress';
import { useInventoryMigration } from '../../hooks/useInventoryMigration';
import { BottomSheet } from '../ui/BottomSheet';
import styles from './HideoutPage.module.css';

function HideoutSkeleton() {
  const pct = useFakeProgress();
  return (
    <>
      <ProgressBar value={pct} />

      {/* サマリー行スケルトン */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton height="12px" borderRadius="4px" />
        <Skeleton width="180px" height="0.85rem" />
      </div>

      {/* 2カラムレイアウトスケルトン */}
      <div className={styles.content}>
        <div className={styles.treeWrapper}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} width="140px" height="100px" borderRadius="6px" />
            ))}
          </div>
        </div>
        <div className={styles.detailWrapper}>
          <Skeleton height="200px" borderRadius="6px" />
        </div>
      </div>
    </>
  );
}

export function HideoutPage() {
  const t = useT();
  const { data: hideout, isLoading } = useHideoutStations();
  const { builtLevelIds } = useHideoutProgressMap();
  const selectedStationId = useHideoutStore((s) => s.selectedStationId);
  const mobileTab = useHideoutStore((s) => s.mobileTab);
  const setMobileTab = useHideoutStore((s) => s.setMobileTab);
  const summaryFilter = useHideoutStore((s) => s.summaryFilter);
  const setSummaryFilter = useHideoutStore((s) => s.setSummaryFilter);
  const summaryCompact = useHideoutStore((s) => s.summaryCompact);
  const toggleSummaryCompact = useHideoutStore((s) => s.toggleSummaryCompact);

  // グローバル在庫→レベル別在庫の遅延移行
  useInventoryMigration(hideout, builtLevelIds);

  const selectedStation = useMemo(() => {
    if (!hideout || !selectedStationId) return null;
    return hideout.stationMap.get(selectedStationId) ?? null;
  }, [hideout, selectedStationId]);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.hideout_meta_title}</title>
        <meta name="description" content={t.hideout_meta_desc} />
      </Helmet>
      <h1 className={styles.pageTitle}>{t.hideout_page_title}</h1>

      {isLoading || !hideout ? (
        <HideoutSkeleton />
      ) : (
        <>
          <HideoutSummary hideout={hideout} builtLevelIds={builtLevelIds} />

          {/* タブバー */}
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${mobileTab === 'list' ? styles.tabActive : ''}`}
              onClick={() => setMobileTab('list')}
            >
              {t.hideout_tab_list}
            </button>
<button
              className={`${styles.tab} ${mobileTab === 'summary' ? styles.tabActive : ''}`}
              onClick={() => setMobileTab('summary')}
            >
              {t.hideout_tab_summary}
            </button>
          </div>

          {mobileTab === 'summary' ? (
            <div className={styles.summaryWrapper}>
              <div className={styles.summaryFilterBar}>
                <button
                  className={`${styles.filterBtn} ${summaryFilter === 'buildable' ? styles.filterActive : ''}`}
                  onClick={() => setSummaryFilter('buildable')}
                  title={t.hideout_summary_filter_buildable_tip}
                >
                  {t.hideout_summary_filter_buildable}
                </button>
                <button
                  className={`${styles.filterBtn} ${summaryFilter === 'not_built' ? styles.filterActive : ''}`}
                  onClick={() => setSummaryFilter('not_built')}
                  title={t.hideout_summary_filter_not_built_tip}
                >
                  {t.hideout_summary_filter_not_built}
                </button>
                <button
                  className={`${styles.filterBtn} ${summaryFilter === 'all' ? styles.filterActive : ''}`}
                  onClick={() => setSummaryFilter('all')}
                  title={t.hideout_summary_filter_all_tip}
                >
                  {t.hideout_summary_filter_all}
                </button>
                <button
                  className={`${styles.filterBtn} ${summaryCompact ? styles.filterActive : ''}`}
                  onClick={toggleSummaryCompact}
                  title={t.hideout_summary_compact_tip}
                >
                  {t.hideout_summary_compact}
                </button>
              </div>
              {!summaryCompact && (
                <p className={styles.allocationNote}>{t.hideout_summary_allocation_note}</p>
              )}
              <BuildableSummary hideout={hideout} builtLevelIds={builtLevelIds} filter={summaryFilter} compact={summaryCompact} />
            </div>
          ) : (
            <>
              <div className={styles.content}>
                <div className={`${styles.treeWrapper} ${mobileTab !== 'list' ? styles.mobileHidden : ''}`}>
                  <HideoutGrid hideout={hideout} builtLevelIds={builtLevelIds} />
                </div>
                <div className={styles.detailWrapper}>
                  <StationDetailPanel
                    station={selectedStation}
                    hideout={hideout}
                    builtLevelIds={builtLevelIds}
                  />
                </div>
              </div>

              {/* モバイル用BottomSheet */}
              <BottomSheet
                open={!!selectedStationId}
                onClose={() => useHideoutStore.getState().setSelectedStationId(null)}
                title={selectedStation?.name}
              >
                <StationDetailPanel station={selectedStation} hideout={hideout} builtLevelIds={builtLevelIds} />
              </BottomSheet>
            </>
          )}
        </>
      )}
    </div>
  );
}
