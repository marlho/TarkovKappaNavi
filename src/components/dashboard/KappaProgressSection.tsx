import type { KappaStats, TraderKappaStats } from '../../domain/kappaProgress';
import { useT } from '../../i18n';
import { ProgressBar } from '../ui/ProgressBar';
import styles from './KappaProgressSection.module.css';

interface KappaProgressSectionProps {
  stats: KappaStats;
  byTrader: TraderKappaStats[];
}

export function KappaProgressSection({ stats, byTrader }: KappaProgressSectionProps) {
  const t = useT();
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{t.kappa_progress_title}</div>

      <div className={styles.mainStats}>
        <div className={styles.mainBar}>
          <ProgressBar value={stats.percent} />
        </div>
        <span className={styles.statText}>
          {stats.done}/{stats.total} ({stats.percent}%)
        </span>
      </div>

      {byTrader.length > 0 && (
        <div className={styles.traders}>
          {byTrader.map((t) => (
            <div key={t.traderId} className={styles.traderRow}>
              <span className={styles.traderName}>{t.traderName}</span>
              <div className={styles.traderBar}>
                <ProgressBar value={t.percent} />
              </div>
              <span className={styles.traderStat}>
                {t.done}/{t.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
