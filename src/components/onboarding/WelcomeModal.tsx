import { useState } from 'react';
import { useT } from '../../i18n';
import { useProfileStore } from '../../stores/profileStore';
import { WelcomeStep } from './steps/WelcomeStep';
import { LevelStep } from './steps/LevelStep';
import { ScreenGuideStep } from './steps/ScreenGuideStep';
import { ReadyStep } from './steps/ReadyStep';
import styles from './WelcomeModal.module.css';

const TOTAL_STEPS = 4;

export function WelcomeModal() {
  const t = useT();
  const setOnboardingDone = useProfileStore((s) => s.setOnboardingDone);
  const [step, setStep] = useState(0);

  const finish = () => {
    setOnboardingDone(true);
  };

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ステップインジケーター */}
        <div className={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={styles.dot}
              data-active={i === step || undefined}
              data-done={i < step || undefined}
            />
          ))}
        </div>

        {/* ステップコンテンツ */}
        <div className={styles.body}>
          {step === 0 && <WelcomeStep />}
          {step === 1 && <LevelStep />}
          {step === 2 && <ScreenGuideStep />}
          {step === 3 && <ReadyStep />}
        </div>

        {/* フッターナビ */}
        <div className={styles.footer}>
          {!isLast ? (
            <button className={styles.skipBtn} onClick={finish}>
              {t.onboarding_skip}
            </button>
          ) : (
            <span />
          )}
          <div className={styles.navGroup}>
            {step > 0 && (
              <button className={styles.backBtn} onClick={() => setStep(step - 1)}>
                {t.onboarding_back}
              </button>
            )}
            {isLast ? (
              <button className={styles.nextBtn} onClick={finish}>
                {t.onboarding_start}
              </button>
            ) : (
              <button className={styles.nextBtn} onClick={() => setStep(step + 1)}>
                {t.onboarding_next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
