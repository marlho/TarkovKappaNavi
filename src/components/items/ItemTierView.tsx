import { useMemo, useState, useCallback } from 'react';
import { groupByTier, TIER_ORDER, buildTierConfig } from '../../domain/itemTier';
import { useTierThresholds } from '../../stores/tierStore';
import { useT } from '../../i18n';
import type { ItemModel, PriceTier } from '../../api/types';
import type { TierConfig } from '../../domain/itemTier';
import { ItemCard } from './ItemCard';
import styles from './ItemTierView.module.css';

const ITEMS_PER_PAGE = 60;

interface ItemTierViewProps {
  items: ItemModel[];
  onItemClick?: (itemId: string) => void;
}

function TierSection({ items, onItemClick, cfg }: { tier: PriceTier; items: ItemModel[]; onItemClick?: (itemId: string) => void; cfg: TierConfig }) {
  const t = useT();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const shown = items.slice(0, visibleCount);
  const remaining = items.length - visibleCount;

  const showMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.header} style={{ borderLeftColor: cfg.color }}>
        <span className={styles.tierLabel} style={{ color: cfg.color }}>{cfg.label}</span>
        <span className={styles.tierDesc}>{cfg.description}</span>
        <span className={styles.count}>{t.items_tier_count.replace('{count}', String(items.length))}</span>
      </div>
      <div className={styles.grid}>
        {shown.map((item) => (
          <ItemCard key={item.id} item={item} onClick={onItemClick} />
        ))}
      </div>
      {remaining > 0 && (
        <button type="button" className={styles.moreBtn} onClick={showMore}>
          {t.items_show_more.replace('{show}', String(Math.min(remaining, ITEMS_PER_PAGE))).replace('{remaining}', String(remaining))}
        </button>
      )}
    </section>
  );
}

export function ItemTierView({ items, onItemClick }: ItemTierViewProps) {
  const thresholds = useTierThresholds();
  const tierConfig = useMemo(() => buildTierConfig(thresholds), [thresholds]);
  const grouped = useMemo(() => groupByTier(items), [items]);

  return (
    <div className={styles.container}>
      {TIER_ORDER.map((tier) => {
        const tierItems = grouped.get(tier)!;
        if (tierItems.length === 0) return null;
        return <TierSection key={tier} tier={tier} items={tierItems} onItemClick={onItemClick} cfg={tierConfig[tier]} />;
      })}
    </div>
  );
}
