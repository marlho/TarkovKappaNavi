import { useItemDetail } from '../../api/hooks';
import { useItems } from '../../api/hooks';
import { useT, useLang } from '../../i18n';
import type { Dictionary } from '../../i18n';
import { TIER_CONFIG } from '../../domain/itemTier';
import { calcTier } from '../../api/normalize';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { getSourceLabel } from './ItemCard';
import type { ItemDetailModel, ItemDetailBarter, ItemDetailCraft, ItemDetailBarterItem } from '../../api/types';
import styles from './ItemDetailModal.module.css';

interface ItemDetailModalProps {
  itemId: string | null;
  onClose: () => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}

function formatDuration(seconds: number, t: Dictionary): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return t.duration_hm.replace('{h}', String(h)).replace('{m}', String(m));
  if (h > 0) return t.duration_h.replace('{h}', String(h));
  return t.duration_m.replace('{m}', String(m));
}

function RecipeItemChips({ items }: { items: ItemDetailBarterItem[] }) {
  return (
    <div className={styles.recipeItems}>
      {items.map((ri, i) => (
        <span key={i} className={styles.recipeItemChip}>
          {ri.iconLink && <img src={ri.iconLink} alt="" className={styles.recipeItemIcon} />}
          {ri.name} x{ri.count}
        </span>
      ))}
    </div>
  );
}

function BarterCard({ barter, label, t }: { barter: ItemDetailBarter; label?: string; t: Dictionary }) {
  return (
    <div className={styles.recipeCard}>
      <div className={styles.recipeHeader}>
        {label && <span className={styles.traderTag}>{label}</span>}
        <span>{getSourceLabel(t, barter.traderName.toLowerCase())}</span>
        <span className={styles.recipeMeta}>LL{barter.level}</span>
        {barter.taskUnlockName && <span className={styles.recipeMeta}>({barter.taskUnlockName})</span>}
      </div>
      <RecipeItemChips items={barter.requiredItems} />
      <span className={styles.arrow}>→</span>
      <RecipeItemChips items={barter.rewardItems} />
    </div>
  );
}

function CraftCard({ craft, label, t }: { craft: ItemDetailCraft; label?: string; t: Dictionary }) {
  return (
    <div className={styles.recipeCard}>
      <div className={styles.recipeHeader}>
        {label && <span className={styles.traderTag}>{label}</span>}
        <span>{craft.stationName}</span>
        <span className={styles.recipeMeta}>Lv{craft.level}</span>
        <span className={styles.recipeMeta}>{formatDuration(craft.duration, t)}</span>
      </div>
      <RecipeItemChips items={craft.requiredItems} />
      <span className={styles.arrow}>→</span>
      <RecipeItemChips items={craft.rewardItems} />
    </div>
  );
}

function DetailContent({ detail }: { detail: ItemDetailModel }) {
  const t = useT();
  const lang = useLang();
  const displayName = lang === 'en' ? detail.nameEn : detail.name;

  const { data: itemsData } = useItems();
  const itemModel = itemsData?.itemMap.get(detail.id);
  const tier = itemModel?.tier ?? calcTier(0);
  const tierCfg = TIER_CONFIG[tier];

  const hasTaskSection = detail.usedInTasks.length > 0 || detail.receivedFromTasks.length > 0;
  const hasCraftBarterSection =
    detail.craftsFor.length > 0 ||
    detail.craftsUsing.length > 0 ||
    detail.bartersFor.length > 0 ||
    detail.bartersUsing.length > 0;
  const hasBuySection = detail.buyFor.length > 0;

  return (
    <>
      {/* ヘッダー */}
      <div className={styles.header}>
        <div className={styles.imageWrap}>
          {detail.image512pxLink ? (
            <img src={detail.image512pxLink} alt={detail.shortName} className={styles.image} />
          ) : itemModel?.iconLink ? (
            <img src={itemModel.iconLink} alt={detail.shortName} className={styles.image} />
          ) : null}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <span className={styles.tierBadge} style={{ color: tierCfg.color, borderColor: tierCfg.color }}>
              {tierCfg.label}
            </span>
            <span className={styles.itemName}>{displayName}</span>
          </div>
          <div className={styles.meta}>
            <span>{detail.width}x{detail.height} ({detail.width * detail.height}slot)</span>
            {detail.weight != null && <span>{detail.weight}kg</span>}
          </div>
          {detail.wikiLink && (
            <div className={styles.wikiLinks}>
              <a href={detail.wikiLink} target="_blank" rel="noopener noreferrer" className={styles.wikiLink}>
                Wiki &rarr;
              </a>
              <a
                href={`https://wikiwiki.jp/eft/${encodeURIComponent(detail.nameEn)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.wikiLink}
              >
                {t.item_detail_wiki}
              </a>
            </div>
          )}
          {detail.description && <p className={styles.description}>{detail.description}</p>}
        </div>
      </div>

      {/* セクション1: タスク関連 */}
      {hasTaskSection && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t.item_detail_tasks}</div>
          {detail.usedInTasks.length > 0 && (
            <>
              <div className={styles.subLabel}>{t.item_detail_required_tasks}</div>
              <div className={styles.taskList}>
                {detail.usedInTasks.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <span className={styles.traderTag}>{task.traderName}</span>
                    <span>{task.name}</span>
                    {task.kappaRequired && <span className={styles.kappaBadge}>Kappa</span>}
                  </div>
                ))}
              </div>
            </>
          )}
          {detail.receivedFromTasks.length > 0 && (
            <>
              <div className={styles.subLabel}>{t.item_detail_reward_tasks}</div>
              <div className={styles.taskList}>
                {detail.receivedFromTasks.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <span className={styles.traderTag}>{task.traderName}</span>
                    <span>{task.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* セクション2: クラフト・バーター関連 */}
      {hasCraftBarterSection && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t.item_detail_crafts_barters}</div>
          <div className={styles.recipeList}>
            {detail.craftsFor.map((c, i) => (
              <CraftCard key={`cf-${i}`} craft={c} label={t.item_detail_craft_for} t={t} />
            ))}
            {detail.craftsUsing.map((c, i) => (
              <CraftCard key={`cu-${i}`} craft={c} label={t.item_detail_craft_using} t={t} />
            ))}
            {detail.bartersFor.map((b, i) => (
              <BarterCard key={`bf-${i}`} barter={b} label={t.item_detail_barter_for} t={t} />
            ))}
            {detail.bartersUsing.map((b, i) => (
              <BarterCard key={`bu-${i}`} barter={b} label={t.item_detail_barter_using} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* セクション3: 購入価格・入手先 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t.item_detail_buy_prices}</div>
        {hasBuySection ? (
          <table className={styles.buyTable}>
            <thead>
              <tr>
                <th>{t.item_detail_source}</th>
                <th>LL</th>
                <th>{t.item_detail_currency}</th>
                <th>{t.item_detail_price}</th>
                <th>{t.item_detail_rub_price}</th>
              </tr>
            </thead>
            <tbody>
              {detail.buyFor.map((bp, i) => (
                <tr key={i}>
                  <td>{getSourceLabel(t, bp.source)}</td>
                  <td>{bp.loyaltyLevel ?? '-'}</td>
                  <td>{bp.currency}</td>
                  <td>{formatPrice(bp.price)}</td>
                  <td>₽{formatPrice(bp.priceRUB)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyNote}>{t.item_detail_no_buy}</p>
        )}
      </div>
    </>
  );
}

export function ItemDetailModal({ itemId, onClose }: ItemDetailModalProps) {
  const t = useT();
  const { data: detail, isLoading } = useItemDetail(itemId);

  return (
    <Modal open={!!itemId} onClose={onClose}>
      {isLoading ? (
        <div className={styles.loading}><Spinner />{t.item_detail_loading}</div>
      ) : detail ? (
        <DetailContent detail={detail} />
      ) : (
        <p className={styles.emptyNote}>{t.item_detail_not_found}</p>
      )}
    </Modal>
  );
}
