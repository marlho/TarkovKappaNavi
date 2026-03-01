import { useState } from 'react';
import { useTierStore, DEFAULT_TIER_THRESHOLDS, type TierThresholds } from '../../stores/tierStore';
import { useT } from '../../i18n';
import styles from './TierSettings.module.css';

const TIER_KEYS = ['S', 'A', 'B', 'C'] as const;
const TIER_COLORS: Record<string, string> = {
  S: '#ffd700',
  A: '#e74c3c',
  B: '#b5a55a',
  C: '#9e9a93',
};

export function TierSettings() {
  const t = useT();
  const thresholds = useTierStore((s) => s.thresholds);
  const setThresholds = useTierStore((s) => s.setThresholds);
  const resetThresholds = useTierStore((s) => s.resetThresholds);

  const [draft, setDraft] = useState<TierThresholds>({ ...thresholds });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof TierThresholds, raw: string) => {
    const v = parseInt(raw, 10);
    if (isNaN(v) || v < 0) return;
    const next = { ...draft, [key]: v };
    setDraft(next);

    // バリデーション: S > A > B > C > 0
    if (next.S <= next.A || next.A <= next.B || next.B <= next.C || next.C <= 0) {
      setError(t.tier_validation_error);
      return;
    }
    setError(null);
    setThresholds(next);
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_TIER_THRESHOLDS });
    setError(null);
    resetThresholds();
  };

  const isDefault = TIER_KEYS.every((k) => thresholds[k] === DEFAULT_TIER_THRESHOLDS[k]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {TIER_KEYS.map((key) => (
          <div key={key} className={styles.row}>
            <span className={styles.tierBadge} style={{ color: TIER_COLORS[key] }}>
              {key}
            </span>
            <span className={styles.label}>≥</span>
            <input
              type="number"
              className={styles.input}
              value={draft[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              min={10000}
              step={10000}
            />
            <span className={styles.unit}>₽/slot</span>
          </div>
        ))}
        <div className={styles.row}>
          <span className={styles.tierBadge} style={{ color: '#6b6660' }}>D</span>
          <span className={styles.label} style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {t.tier_below_c}
          </span>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {!isDefault && (
        <button className={styles.resetBtn} onClick={handleReset}>
          {t.tier_reset}
        </button>
      )}
    </div>
  );
}
