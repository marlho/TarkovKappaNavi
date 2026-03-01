import type { NormalizedHideout } from '../../api/types';
import { calcHideoutProgress } from '../../domain/hideoutUnlock';
import { ProgressBar } from '../ui/ProgressBar';
import styles from './HideoutSummary.module.css';

interface HideoutSummaryProps {
  hideout: NormalizedHideout;
  builtLevelIds: Set<string>;
}

export function HideoutSummary({ hideout, builtLevelIds }: HideoutSummaryProps) {
  const { totalLevels, builtCount, percent } = calcHideoutProgress(hideout, builtLevelIds);

  return (
    <div className={styles.summary}>
      <div className={styles.barWrapper}>
        <ProgressBar value={percent} />
      </div>
      <span className={styles.stats}>
        {builtCount} / {totalLevels} ({percent}%)
      </span>
    </div>
  );
}
