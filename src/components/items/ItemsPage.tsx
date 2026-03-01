import { Helmet } from 'react-helmet-async';
import { useMemo, useState, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { useItems, useTasks } from '../../api/hooks';
import { useItemFilterStore } from '../../stores/itemFilterStore';
import { useT } from '../../i18n';
import { filterItems } from '../../domain/itemTier';
import { ItemFilterBar } from './ItemFilterBar';
import { ItemTierView } from './ItemTierView';
import { ItemGridView } from './ItemGridView';
import { ItemDetailModal } from './ItemDetailModal';
import { Modal } from '../ui/Modal';
import { TierSettings } from '../settings/TierSettings';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';
import { useFakeProgress } from '../../hooks/useFakeProgress';
import styles from './ItemsPage.module.css';

function ItemsPageSkeleton() {
  const t = useT();
  const pct = useFakeProgress();
  return (
    <div className={styles.page}>
      <ProgressBar value={pct} />
      <h1 className={styles.title}>{t.items_page_title}</h1>

      {/* フィルターバースケルトン */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Skeleton width="200px" height="36px" borderRadius="4px" />
        <Skeleton width="100px" height="36px" borderRadius="4px" />
        <Skeleton width="100px" height="36px" borderRadius="4px" />
      </div>

      {/* サマリーテキストスケルトン */}
      <Skeleton width="120px" height="0.85rem" />

      {/* アイテムグリッドスケルトン */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width="180px" height="120px" borderRadius="6px" />
        ))}
      </div>
    </div>
  );
}

export function ItemsPage() {
  const t = useT();
  const { data, isLoading, error } = useItems();
  const { data: tasksData } = useTasks();
  const { search, types, tiers, taskRelations, sortBy, sortDir, viewMode } = useItemFilterStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tierOpen, setTierOpen] = useState(false);
  const handleItemClick = useCallback((itemId: string) => setSelectedItemId(itemId), []);
  const handleCloseModal = useCallback(() => setSelectedItemId(null), []);

  const collectorNamePattern = useMemo(() => {
    const escaped = t.collector_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$|^Collector$`, 'i');
  }, [t.collector_name]);

  const { kappaTaskIds, collectorTaskId } = useMemo(() => {
    if (!tasksData) return { kappaTaskIds: new Set<string>(), collectorTaskId: null };
    const kappaIds = new Set<string>();
    let cId: string | null = null;
    for (const q of tasksData.quests) {
      if (q.kappaRequired) kappaIds.add(q.id);
      if (collectorNamePattern.test(q.name)) cId = q.id;
    }
    return { kappaTaskIds: kappaIds, collectorTaskId: cId };
  }, [tasksData, collectorNamePattern]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return filterItems(data.items, { search, types, tiers, taskRelations, kappaTaskIds, collectorTaskId, sortBy, sortDir });
  }, [data, search, types, tiers, taskRelations, kappaTaskIds, collectorTaskId, sortBy, sortDir]);

  if (isLoading) {
    return <ItemsPageSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{t.items_fetch_error.replace('{error}', (error as Error).message)}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.items_meta_title}</title>
        <meta name="description" content={t.items_meta_desc} />
      </Helmet>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t.items_page_title}</h1>
        <button
          type="button"
          className={styles.tierBtn}
          onClick={() => setTierOpen(true)}
          title={t.settings_tier}
        >
          <Settings size={18} />
        </button>
      </div>
      <Modal open={tierOpen} onClose={() => setTierOpen(false)} title={t.settings_tier}>
        <TierSettings />
      </Modal>
      <ItemFilterBar availableTypes={data?.availableTypes ?? []} />
      <div className={styles.summary}>{t.items_count.replace('{count}', String(filtered.length))}</div>
      {viewMode === 'tier' ? (
        <ItemTierView items={filtered} onItemClick={handleItemClick} />
      ) : (
        <ItemGridView items={filtered} onItemClick={handleItemClick} />
      )}
      <ItemDetailModal itemId={selectedItemId} onClose={handleCloseModal} />
    </div>
  );
}
