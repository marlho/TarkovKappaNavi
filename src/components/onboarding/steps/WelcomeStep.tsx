import { useT } from '../../../i18n';
import { useProfileStore } from '../../../stores/profileStore';
import type { Lang } from '../../../i18n/types';
import styles from './steps.module.css';

export function WelcomeStep() {
  const t = useT();
  const lang = useProfileStore((s) => s.lang);
  const setLang = useProfileStore((s) => s.setLang);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.title}>{t.onboarding_welcome_title}</div>
      <p className={styles.desc}>{t.onboarding_welcome_desc}</p>
      <div className={styles.langLabel}>{t.onboarding_welcome_lang}</div>
      <div className={styles.langGroup}>
        {(['ja', 'en'] as Lang[]).map((l) => (
          <button
            key={l}
            className={styles.langBtn}
            data-active={lang === l || undefined}
            onClick={() => setLang(l)}
          >
            {l === 'ja' ? '日本語' : 'English'}
          </button>
        ))}
      </div>
    </div>
  );
}
