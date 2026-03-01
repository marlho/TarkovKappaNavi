import { useRef, useState } from 'react';
import { db } from '../../db/database';
import { exportDataSchema, type ExportData } from '../../db/schemas';
import { useProfileStore } from '../../stores/profileStore';
import { useNowPinsStore } from '../../stores/nowPinsStore';
import { useT } from '../../i18n';
import { Modal } from '../ui/Modal';
import styles from './ExportImport.module.css';

type Msg = { type: 'success' | 'error'; text: string } | null;

export function ExportImport() {
  const [msg, setMsg] = useState<Msg>(null);
  const [importData, setImportData] = useState<ExportData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const hydratePins = useNowPinsStore((s) => s.hydrate);
  const t = useT();

  const handleExport = async () => {
    try {
      const profile = await db.profile.get('me');
      const progress = await db.progress.toArray();
      const nowPins = (await db.nowPins.get('me')) ?? { id: 'me', taskIds: [] };
      const notes = await db.notes.toArray();
      const logs = await db.logs.toArray();
      const hideoutProgress = await db.hideoutProgress.toArray();
      const rawMapPins = await db.mapPins.toArray();
      const wipeId = profile?.wipeId ?? 'default';
      const mapPins = rawMapPins.map((p) => ({ ...p, wipeId: p.wipeId || wipeId }));
      const hideoutItemInventory = await db.hideoutLevelInventory.toArray();

      const data = {
        profile: { ...profile, wipeId },
        progress, nowPins, notes, logs, hideoutProgress, mapPins, hideoutItemInventory,
      };
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `rtk-backup-${wipeId}-${dateStr}.json`;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setMsg({ type: 'success', text: t.export_downloaded.replace('{filename}', filename) });
    } catch (e) {
      setMsg({ type: 'error', text: t.export_failed.replace('{error}', String(e)) });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 同じファイルを再選択できるようにinputをリセット
    e.target.value = '';

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = exportDataSchema.safeParse(json);
      if (!parsed.success) {
        setMsg({ type: 'error', text: t.import_invalid_format.replace('{error}', parsed.error.issues.map((i) => i.message).join(', ')) });
        return;
      }
      setImportData(parsed.data);
    } catch {
      setMsg({ type: 'error', text: t.import_invalid_json });
    }
  };

  const handleImportConfirm = async () => {
    if (!importData) return;
    try {
      await db.transaction('rw', [db.profile, db.progress, db.nowPins, db.notes, db.logs, db.hideoutProgress, db.mapPins, db.hideoutLevelInventory, db.hideoutInventory], async () => {
        await db.profile.clear();
        await db.progress.clear();
        await db.nowPins.clear();
        await db.notes.clear();
        await db.logs.clear();
        await db.hideoutProgress.clear();
        await db.mapPins.clear();
        await db.hideoutLevelInventory.clear();
        await db.hideoutInventory.clear();

        await db.profile.put(importData.profile);
        if (importData.progress.length > 0) await db.progress.bulkPut(importData.progress);
        await db.nowPins.put(importData.nowPins);
        if (importData.notes.length > 0) await db.notes.bulkPut(importData.notes);
        if (importData.logs.length > 0) await db.logs.bulkPut(importData.logs);
        if (importData.hideoutProgress && importData.hideoutProgress.length > 0) {
          await db.hideoutProgress.bulkPut(importData.hideoutProgress);
        }
        if (importData.mapPins && importData.mapPins.length > 0) {
          await db.mapPins.bulkPut(importData.mapPins);
        }
        if (importData.hideoutItemInventory && importData.hideoutItemInventory.length > 0) {
          // 新形式（levelId付き）か旧グローバル形式か判定
          const hasLevelId = importData.hideoutItemInventory.some(
            (r) => 'levelId' in r,
          );
          if (hasLevelId) {
            // 新形式: そのままhideoutLevelInventoryに書き込む
            const levelRows = importData.hideoutItemInventory
              .filter((r): r is { levelId: string; itemId: string; ownedCount: number } => 'levelId' in r)
              .map(({ levelId, itemId, ownedCount }) => ({ levelId, itemId, ownedCount }));
            if (levelRows.length > 0) {
              await db.hideoutLevelInventory.bulkPut(levelRows);
            }
          } else {
            // 旧グローバル形式: hideoutInventoryに書き込み、遅延移行に任せる
            const globalRows = importData.hideoutItemInventory.map(
              ({ itemId, ownedCount }) => ({ itemId, ownedCount }),
            );
            await db.hideoutInventory.bulkPut(globalRows);
          }
        }
      });

      hydrateProfile(
        importData.profile.currentLevel,
        importData.profile.wipeId,
        importData.profile.autoStartUnlocked,
      );
      hydratePins(importData.nowPins.taskIds ?? []);
      setMsg({ type: 'success', text: t.import_complete });
    } catch (e) {
      setMsg({ type: 'error', text: t.import_save_failed.replace('{error}', String(e)) });
    }
    setImportData(null);
  };

  return (
    <div>
      <div className={styles.buttons}>
        <button onClick={handleExport}>{t.export_btn}</button>
        <button onClick={() => fileRef.current?.click()}>{t.import_btn}</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className={styles.hiddenInput}
          onChange={handleFileSelect}
        />
      </div>

      {msg && (
        <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>
          {msg.text}
        </div>
      )}

      {importData && (
        <Modal open title={t.import_confirm_title} onClose={() => setImportData(null)}>
          <div className={styles.summary}>
            <div>{t.import_wipe_id.replace('{id}', importData.profile.wipeId)}</div>
            <div>{t.import_progress_count.replace('{count}', String(importData.progress.length))}</div>
            <div>{t.import_notes_count.replace('{count}', String(importData.notes.length))}</div>
            <div>{t.import_logs_count.replace('{count}', String(importData.logs.length))}</div>
            <div>{t.import_hideout_count.replace('{count}', String(importData.hideoutProgress?.length ?? 0))}</div>
            <div>{t.import_map_pins_count.replace('{count}', String(importData.mapPins?.length ?? 0))}</div>
            <div>{t.import_hideout_inventory_count.replace('{count}', String(importData.hideoutItemInventory?.length ?? 0))}</div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {t.import_overwrite_question}
          </p>
          <div className={styles.confirmButtons}>
            <button className={styles.btnPrimary} onClick={handleImportConfirm}>{t.import_overwrite_btn}</button>
            <button onClick={() => setImportData(null)}>{t.common_cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
