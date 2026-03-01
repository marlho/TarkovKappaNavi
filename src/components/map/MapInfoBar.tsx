import { ExternalLink } from 'lucide-react';
import type { MapModel } from '../../api/types';
import styles from './MapInfoBar.module.css';

interface MapInfoBarProps {
  map: MapModel;
}

export function MapInfoBar({ map }: MapInfoBarProps) {
  const pmcExtracts = map.extracts.filter((e) => e.faction !== 'Scav');
  const scavExtracts = map.extracts.filter((e) => e.faction === 'Scav');

  return (
    <div className={styles.infoBar}>
      {map.raidDuration != null && (
        <span className={styles.stat}>
          <span className={styles.statLabel}>Raid:</span>
          <span className={styles.statValue}>{map.raidDuration}min</span>
        </span>
      )}

      {map.players && (
        <>
          <span className={styles.divider} />
          <span className={styles.stat}>
            <span className={styles.statLabel}>Players:</span>
            <span className={styles.statValue}>{map.players}</span>
          </span>
        </>
      )}

      {map.extracts.length > 0 && (
        <>
          <span className={styles.divider} />
          <span className={styles.stat}>
            <span className={styles.statLabel}>Extracts:</span>
            <span className={styles.statValue}>
              {pmcExtracts.length} PMC / {scavExtracts.length} Scav
            </span>
          </span>
        </>
      )}

      {map.bosses.length > 0 && (
        <>
          <span className={styles.divider} />
          <span className={styles.stat}>
            <span className={styles.statLabel}>Bosses:</span>
          </span>
          <span className={styles.bossList}>
            {map.bosses.map((b) => (
              <span key={b.normalizedName} className={styles.bossTag}>
                {b.name}
                <span className={styles.bossChance}>
                  {Math.round(b.spawnChance * 100)}%
                </span>
              </span>
            ))}
          </span>
        </>
      )}

      {map.wiki && (
        <a
          className={styles.wikiLink}
          href={map.wiki}
          target="_blank"
          rel="noopener noreferrer"
        >
          Wiki <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
