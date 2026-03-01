import { useMemo } from 'react';
import { useT } from '../../i18n';
import styles from './ViewTabs.module.css';

export type ViewMode = 'list' | 'flow';

interface ViewTabsProps {
  active: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewTabs({ active, onChange }: ViewTabsProps) {
  const t = useT();
  const tabs: { mode: ViewMode; label: string }[] = useMemo(() => [
    { mode: 'flow', label: t.view_flow },
    { mode: 'list', label: t.view_list },
  ], [t]);
  return (
    <div className={styles.tabs}>
      {tabs.map((t) => (
        <button
          key={t.mode}
          type="button"
          className={`${styles.tab}${active === t.mode ? ` ${styles.active}` : ''}`}
          onClick={() => onChange(t.mode)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
