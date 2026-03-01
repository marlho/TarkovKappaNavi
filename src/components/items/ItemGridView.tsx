import { useState, useCallback } from 'react';
import { useT } from '../../i18n';
import type { ItemModel } from '../../api/types';
import { ItemCard } from './ItemCard';
import styles from './ItemGridView.module.css';

const ITEMS_PER_PAGE = 100;

interface ItemGridViewProps {
  items: ItemModel[];
  onItemClick?: (itemId: string) => void;
}

export function ItemGridView({ items, onItemClick }: ItemGridViewProps) {
  const t = useT();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const shown = items.slice(0, visibleCount);
  const remaining = items.length - visibleCount;

  const showMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  return (
    <div>
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
    </div>
  );
}
