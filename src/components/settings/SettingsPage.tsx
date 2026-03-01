import { Helmet } from 'react-helmet-async';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { upsertProfile } from '../../db/operations';
import { useT } from '../../i18n';
import { LevelInput } from './LevelInput';
import { ExportImport } from './ExportImport';
import { QrShare } from './QrShare';
import { CacheControl } from './CacheControl';
import { ResetSection } from './ResetSection';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const level = useProfileStore((s) => s.currentLevel);
  const setLevel = useProfileStore((s) => s.setLevel);
  const wipeId = useProfileStore((s) => s.wipeId);
  const setWipeId = useProfileStore((s) => s.setWipeId);
  const autoStart = useProfileStore((s) => s.autoStartUnlocked);
  const setAutoStart = useProfileStore((s) => s.setAutoStart);
  const lang = useProfileStore((s) => s.lang);
  const setLang = useProfileStore((s) => s.setLang);
  const setOnboardingDone = useProfileStore((s) => s.setOnboardingDone);
  const t = useT();

  const [wipeInput, setWipeInput] = useState(wipeId);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync store wipeId to local input on external changes
  useEffect(() => { setWipeInput(wipeId); }, [wipeId]);

  const handleLevelChange = useCallback((v: number) => {
    setLevel(v);
    upsertProfile({ currentLevel: v });
  }, [setLevel]);

  const handleWipeChange = (v: string) => {
    if (v.length > 50) return;
    setWipeInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setWipeId(v);
      upsertProfile({ wipeId: v });
    }, 300);
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.settings_meta_title}</title>
        <meta name="description" content={t.settings_meta_desc} />
      </Helmet>
      <h1 className={styles.pageTitle}>{t.settings_title}</h1>

      {/* Player settings */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>{t.settings_player}</div>
        <p className={styles.cardDesc}>{t.settings_player_desc}</p>
        <div className={styles.cardContent}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.settings_level}</span>
            <LevelInput value={level} onChange={handleLevelChange} />
          </div>
          <p className={styles.fieldHint}>{t.settings_level_hint}</p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.settings_wipe_id}</span>
            <input
              type="text"
              value={wipeInput}
              onChange={(e) => handleWipeChange(e.target.value)}
              placeholder={t.settings_wipe_placeholder}
              maxLength={50}
              style={{
                width: '200px',
                padding: '6px 10px',
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>
          <p className={styles.fieldHint}>{t.settings_wipe_hint}</p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.settings_auto_start}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                style={{ accentColor: 'var(--accent-khaki)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t.settings_auto_start_desc}
              </span>
            </label>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.settings_lang}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setLang('ja')}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                  color: lang === 'ja' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  background: lang === 'ja' ? 'var(--accent-khaki)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                日本語
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                  color: lang === 'en' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  background: lang === 'en' ? 'var(--accent-khaki)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                English
              </button>
            </div>
          </div>
          <p className={styles.fieldHint}>{t.settings_lang_desc}</p>
        </div>
      </div>

      {/* Export / Import */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>{t.settings_data}</div>
        <p className={styles.cardDesc}>{t.settings_data_desc}</p>
        <ExportImport />
      </div>

      {/* QR Share */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>{t.settings_qr}</div>
        <p className={styles.cardDesc}>{t.settings_qr_desc}</p>
        <QrShare />
      </div>

      {/* Cache control */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>{t.settings_cache}</div>
        <p className={styles.cardDesc}>{t.settings_cache_desc}</p>
        <CacheControl />
      </div>

      {/* Welcome guide */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>{t.settings_show_welcome}</div>
        <p className={styles.cardDesc}>{t.settings_show_welcome_desc}</p>
        <div className={styles.cardContent}>
          <button
            type="button"
            onClick={() => setOnboardingDone(false)}
            style={{
              padding: '6px 16px',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              color: 'var(--bg-primary)',
              background: 'var(--accent-khaki)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {t.settings_show_welcome}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className={`${styles.card} ${styles.dangerCard}`}>
        <div className={styles.cardTitle}>{t.settings_danger}</div>
        <p className={styles.cardDesc}>{t.settings_danger_desc}</p>
        <ResetSection />
      </div>
    </div>
  );
}
