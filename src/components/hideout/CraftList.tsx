import type { CraftModel } from '../../api/types';
import type { Dictionary } from '../../i18n/types';
import { useT } from '../../i18n';
import { useSelectionStore } from '../../stores/selectionStore';
import styles from './CraftList.module.css';

interface CraftListProps {
  crafts: CraftModel[];
}

function formatDuration(seconds: number, t: Dictionary): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return t.duration_hm.replace('{h}', String(h)).replace('{m}', String(m));
  if (h > 0) return t.duration_h.replace('{h}', String(h));
  return t.duration_m.replace('{m}', String(m));
}

export function CraftList({ crafts }: CraftListProps) {
  const t = useT();
  const setSelectedTaskId = useSelectionStore((s) => s.setSelectedTaskId);

  if (crafts.length === 0) {
    return <div className={styles.empty}>{t.hideout_no_crafts}</div>;
  }

  return (
    <div className={styles.list}>
      {crafts.map((craft) => (
        <div key={craft.id} className={styles.craft}>
          <div className={styles.craftHeader}>
            <span className={styles.duration}>{formatDuration(craft.duration, t)}</span>
            {craft.taskUnlockId && (
              <span
                className={styles.taskLink}
                onClick={() => setSelectedTaskId(craft.taskUnlockId)}
              >
                {craft.taskUnlockName}
              </span>
            )}
          </div>

          {/* 報酬 */}
          <div className={styles.label}>{t.hideout_reward}</div>
          {craft.rewardItems.map((item, i) => (
            <div key={i} className={styles.itemRow}>
              {item.iconLink && <img src={item.iconLink} alt="" className={styles.itemIcon} />}
              <span className={`${styles.itemName} ${styles.rewardItems}`}>{item.itemName}</span>
              <span className={styles.itemCount}>x{item.count}</span>
            </div>
          ))}

          {/* 材料 */}
          <div className={styles.label}>{t.hideout_materials}</div>
          {craft.requiredItems.map((item, i) => (
            <div key={i} className={styles.itemRow}>
              {item.iconLink && <img src={item.iconLink} alt="" className={styles.itemIcon} />}
              <span className={styles.itemName}>{item.itemName}</span>
              <span className={styles.itemCount}>x{item.count}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
