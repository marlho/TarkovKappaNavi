import type { NextUnlockGroup } from '../../domain/nextUnlock';
import { useT } from '../../i18n';
import { useSelectionStore } from '../../stores/selectionStore';
import styles from './NextUnlockPreview.module.css';

interface NextUnlockPreviewProps {
  groups: NextUnlockGroup[];
}

export function NextUnlockPreview({ groups }: NextUnlockPreviewProps) {
  const t = useT();
  const setSelected = useSelectionStore((s) => s.setSelectedTaskId);

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{t.next_unlock_title}</div>

      {groups.length === 0 ? (
        <div className={styles.empty}>{t.next_unlock_empty}</div>
      ) : (
        groups.map((g) => (
          <div key={g.level} className={styles.group}>
            <div className={styles.levelHeader}>Lv. {g.level}</div>
            {g.tasks.map((t) => (
              <div
                key={t.id}
                className={styles.taskRow}
                onClick={() => setSelected(t.id)}
              >
                {t.name}
                <span className={styles.traderHint}>({t.traderName})</span>
                {t.kappaRequired && <span className={styles.kappaHint}>K</span>}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
