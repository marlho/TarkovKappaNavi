import { useT } from '../../../i18n';
import type { Dictionary } from '../../../i18n/types';
import styles from './steps.module.css';

interface GuideItem {
  titleKey: keyof Dictionary;
  descKey: keyof Dictionary;
}

const guides: GuideItem[] = [
  { titleKey: 'onboarding_guide_dashboard', descKey: 'onboarding_guide_dashboard_desc' },
  { titleKey: 'onboarding_guide_tasks', descKey: 'onboarding_guide_tasks_desc' },
  { titleKey: 'onboarding_guide_hideout', descKey: 'onboarding_guide_hideout_desc' },
  { titleKey: 'onboarding_guide_items', descKey: 'onboarding_guide_items_desc' },
  { titleKey: 'onboarding_guide_map', descKey: 'onboarding_guide_map_desc' },
  { titleKey: 'onboarding_guide_settings', descKey: 'onboarding_guide_settings_desc' },
];

export function ScreenGuideStep() {
  const t = useT();

  return (
    <div className={styles.stepContainer}>
      <div className={styles.title}>{t.onboarding_guide_title}</div>
      <div className={styles.guideGrid}>
        {guides.map((g) => (
          <div key={g.titleKey} className={styles.guideCard}>
            <span className={styles.guideCardTitle}>{t[g.titleKey]}</span>
            <span className={styles.guideCardDesc}>{t[g.descKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
