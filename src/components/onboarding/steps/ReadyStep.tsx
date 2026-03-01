import { useT } from '../../../i18n';
import styles from './steps.module.css';

export function ReadyStep() {
  const t = useT();

  return (
    <div className={styles.stepContainer}>
      <div className={styles.readyIcon}>&#x2705;</div>
      <div className={styles.title}>{t.onboarding_ready_title}</div>
      <p className={styles.desc}>{t.onboarding_ready_desc}</p>
      <span className={styles.privacyBadge}>{t.onboarding_ready_privacy}</span>
      <div className={styles.tipList}>
        <p className={styles.tipItem}>{t.onboarding_ready_export}</p>
        <p className={styles.tipItem}>{t.onboarding_ready_qr}</p>
      </div>
      <p className={styles.hint}>{t.onboarding_ready_hint}</p>
    </div>
  );
}
