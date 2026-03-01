import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
}

export function ProgressBar({ value, max = 100, color = 'var(--accent-khaki)' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={styles.container} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
