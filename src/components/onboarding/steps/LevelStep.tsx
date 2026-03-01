import { useT } from '../../../i18n';
import { useProfileStore } from '../../../stores/profileStore';
import { LevelInput } from '../../settings/LevelInput';
import styles from './steps.module.css';

export function LevelStep() {
  const t = useT();
  const level = useProfileStore((s) => s.currentLevel);
  const setLevel = useProfileStore((s) => s.setLevel);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.title}>{t.onboarding_level_title}</div>
      <p className={styles.desc}>{t.onboarding_level_desc}</p>
      <div className={styles.levelWrap}>
        <div className={styles.levelLabel}>{t.onboarding_level_current}</div>
        <LevelInput value={level} onChange={setLevel} />
      </div>
    </div>
  );
}
