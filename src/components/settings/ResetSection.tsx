import { useState } from 'react';
import { db } from '../../db/database';
import { useNowPinsStore } from '../../stores/nowPinsStore';
import { useT } from '../../i18n';
import { Modal } from '../ui/Modal';
import settingsStyles from './SettingsPage.module.css';

export function ResetSection() {
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [msg, setMsg] = useState('');
  const hydratePins = useNowPinsStore((s) => s.hydrate);
  const t = useT();

  const handleReset = async () => {
    try {
      await db.transaction('rw', [db.progress, db.nowPins, db.notes, db.logs], async () => {
        await db.progress.clear();
        await db.nowPins.clear();
        await db.notes.clear();
        await db.logs.clear();
      });
      hydratePins([]);
      setMsg(t.reset_complete);
    } catch (e) {
      setMsg(t.reset_failed.replace('{error}', String(e)));
    }
    setShowModal(false);
    setConfirmText('');
  };

  return (
    <div>
      <button className={settingsStyles.btnDanger} onClick={() => setShowModal(true)}>
        {t.reset_btn}
      </button>
      {msg && (
        <span style={{ fontSize: '0.75rem', color: 'var(--status-done)', marginLeft: 8 }}>
          {msg}
        </span>
      )}

      {showModal && (
        <Modal open title={t.reset_confirm_title} onClose={() => { setShowModal(false); setConfirmText(''); }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            {t.reset_confirm_text}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            {t.reset_confirm_hint}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t.reset_placeholder}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontFamily: 'inherit',
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={settingsStyles.btnDanger}
              disabled={confirmText !== t.reset_confirm_word}
              onClick={handleReset}
            >
              {t.reset_execute}
            </button>
            <button onClick={() => { setShowModal(false); setConfirmText(''); }}>
              {t.common_cancel}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
