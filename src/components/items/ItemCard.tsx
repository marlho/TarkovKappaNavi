import { TIER_CONFIG } from '../../domain/itemTier';
import { useT, useLang } from '../../i18n';
import type { Dictionary } from '../../i18n';
import type { ItemModel } from '../../api/types';
import styles from './ItemCard.module.css';

interface ItemCardProps {
  item: ItemModel;
  onClick?: (itemId: string) => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}

export function getSourceLabel(t: Dictionary, sourceKey: string): string {
  const dictKey = `item_source_${sourceKey}` as keyof Dictionary;
  return (t[dictKey] as string) ?? sourceKey;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const t = useT();
  const lang = useLang();
  const tierCfg = TIER_CONFIG[item.tier];
  const displayName = lang === 'en' ? item.nameEn : item.name;

  return (
    <div className={styles.card} onClick={() => onClick?.(item.id)} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className={styles.nameRow}>
        <span className={styles.tierBadge} style={{ color: tierCfg.color, borderColor: tierCfg.color }}>
          {tierCfg.label}
        </span>
        <span className={styles.name}>{displayName}</span>
      </div>
      <div className={styles.detailRow}>
        <div className={styles.iconWrap}>
          {item.iconLink ? (
            <img src={item.iconLink} alt={item.shortName} className={styles.icon} loading="lazy" />
          ) : (
            <div className={styles.iconPlaceholder} />
          )}
        </div>
        <span className={styles.size}>{item.slots}slot</span>
        <div className={styles.priceSection}>
          <span className={styles.perSlot}>₽{formatPrice(item.pricePerSlot)}/slot</span>
          <span className={styles.total}>₽{formatPrice(item.bestSellPrice)}</span>
        </div>
        <span className={styles.source}>{getSourceLabel(t, item.bestSellSource)}</span>
      </div>
    </div>
  );
}
