import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  decodeShareData,
  decodeSecondaryData,
  expandPins,
  validateSharePayload,
  type DecodedShareData,
  type DecodedSecondaryData,
} from '../../lib/qrShare';
import { db } from '../../db/database';
import { useProfileStore } from '../../stores/profileStore';
import { useNowPinsStore } from '../../stores/nowPinsStore';
import { useHideoutStations } from '../../api/hooks';
import { useT } from '../../i18n';
import { Modal } from '../ui/Modal';
import styles from './ShareImportPage.module.css';

type Msg = { type: 'success' | 'error'; text: string } | null;

export function ShareImportPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const hydratePins = useNowPinsStore((s) => s.hydrate);
  const { data: hideoutData } = useHideoutStations();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const dParam = searchParams.get('d');
  const hParam = searchParams.get('h');

  // タスク+ハイドアウト込み or タスクのみ（?d=...）
  const decoded = useMemo<DecodedShareData | null>(() => {
    if (!dParam) return null;
    try {
      return decodeShareData(dParam);
    } catch {
      return null;
    }
  }, [dParam]);

  // ハイドアウト+マップピン（?h=...）
  const secondaryData = useMemo<DecodedSecondaryData | null>(() => {
    if (!hParam) return null;
    try {
      return decodeSecondaryData(hParam);
    } catch {
      return null;
    }
  }, [hParam]);

  // データ整合性チェック
  const validation = useMemo(() => {
    if (!dParam) return null;
    return validateSharePayload(dParam);
  }, [dParam]);

  const hasData = dParam || hParam;
  const isSecondaryOnly = !dParam && !!hParam;

  const doneCount = decoded
    ? [...decoded.progressMap.values()].filter((s) => s === 'done').length
    : 0;
  const inProgressCount = decoded
    ? [...decoded.progressMap.values()].filter((s) => s === 'in_progress').length
    : 0;

  // ハイドアウト件数: dから来たbuiltLevelIds、またはhから来たsecondaryData
  const hideoutCount = decoded?.builtLevelIds.length ?? secondaryData?.builtLevelIds.length ?? 0;

  const mapPinCount = decoded?.mapPins.length ?? secondaryData?.mapPins.length ?? 0;

  /** levelIdリストからHideoutProgressRowを構築（APIデータがあればstationId/levelを補完）*/
  const buildHideoutRows = (levelIds: string[], now: number) => {
    return levelIds.map((levelId) => {
      const levelModel = hideoutData?.levelMap.get(levelId);
      return {
        levelId,
        stationId: levelModel?.stationId ?? '',
        level: levelModel?.level ?? 0,
        builtAt: now,
      };
    });
  };

  const handleImport = async () => {
    try {
      const now = Date.now();

      if (isSecondaryOnly) {
        // ハイドアウト+マップピン専用インポート（QR②）
        if (!secondaryData) return;
        await db.transaction('rw', [db.hideoutProgress, db.mapPins], async () => {
          await db.hideoutProgress.clear();
          if (secondaryData.builtLevelIds.length > 0) {
            await db.hideoutProgress.bulkPut(buildHideoutRows(secondaryData.builtLevelIds, now));
          }
          // マップピン
          if (secondaryData.mapPins.length > 0) {
            const profile = await db.profile.get('me');
            const wipeId = profile?.wipeId ?? 'default';
            await db.mapPins.clear();
            await db.mapPins.bulkPut(expandPins(secondaryData.mapPins, wipeId));
          }
        });
        setMsg({ type: 'success', text: t.share_import_hideout_complete });
        setConfirmOpen(false);
        return;
      }

      if (!decoded) return;

      // タスク+ハイドアウト+マップピン込みインポート（QR①または1枚QR）
      await db.transaction('rw', [db.profile, db.progress, db.nowPins, db.hideoutProgress, db.mapPins], async () => {
        // プロフィール更新
        await db.profile.put({
          id: 'me',
          currentLevel: decoded.level,
          wipeId: decoded.wipeId,
          updatedAt: now,
        });

        // 進捗を置き換え
        await db.progress.clear();
        const rows = [...decoded.progressMap.entries()].map(([taskId, status]) => ({
          taskId,
          status,
          completedAt: status === 'done' ? now : null,
          updatedAt: now,
        }));
        if (rows.length > 0) {
          await db.progress.bulkPut(rows);
        }

        // Nowピンを置き換え
        await db.nowPins.put({ id: 'me', taskIds: decoded.nowPinIds });

        // ハイドアウト進捗（含まれている場合のみ）
        if (decoded.builtLevelIds.length > 0) {
          await db.hideoutProgress.clear();
          await db.hideoutProgress.bulkPut(buildHideoutRows(decoded.builtLevelIds, now));
        }

        // マップピン
        if (decoded.mapPins.length > 0) {
          await db.mapPins.clear();
          await db.mapPins.bulkPut(expandPins(decoded.mapPins, decoded.wipeId));
        }
      });

      hydrateProfile(decoded.level, decoded.wipeId);
      hydratePins(decoded.nowPinIds);

      setMsg({ type: 'success', text: t.share_import_complete });
      setConfirmOpen(false);
    } catch (e) {
      setMsg({ type: 'error', text: t.share_import_failed.replace('{error}', String(e)) });
      setConfirmOpen(false);
    }
  };

  if (!hasData) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.title}>{t.share_no_data}</div>
          <p className={styles.note}>{t.share_no_data_desc}</p>
          <button onClick={() => navigate('/dashboard')}>{t.share_go_dashboard}</button>
        </div>
      </div>
    );
  }

  if (dParam && !decoded) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.title}>{t.share_title}</div>
          <p className={styles.note}>{t.share_invalid_format}</p>
          <button onClick={() => navigate('/dashboard')}>{t.share_go_dashboard}</button>
        </div>
      </div>
    );
  }

  if (hParam && !secondaryData) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.title}>{t.share_title}</div>
          <p className={styles.note}>{t.share_invalid_hideout}</p>
          <button onClick={() => navigate('/dashboard')}>{t.share_go_dashboard}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.title}>
          {isSecondaryOnly ? t.share_import_title_hideout : t.share_import_title}
        </div>

        <div className={styles.summary}>
          {decoded && (
            <>
              <div>{t.share_level.replace('{level}', String(decoded.level))}</div>
              <div>{t.share_wipe_id.replace('{id}', decoded.wipeId)}</div>
              <div>{t.share_done_count.replace('{count}', String(doneCount))}</div>
              <div>{t.share_in_progress_count.replace('{count}', String(inProgressCount))}</div>
              <div>{t.share_pin_count.replace('{count}', String(decoded.nowPinIds.length))}</div>
            </>
          )}
          {hideoutCount > 0 && (
            <div>{t.share_hideout_count.replace('{count}', String(hideoutCount))}</div>
          )}
          {mapPinCount > 0 && (
            <div>{t.share_map_pins_count.replace('{count}', String(mapPinCount))}</div>
          )}
        </div>

        {validation && validation.warnings.length > 0 && (
          <div className={styles.message} style={{ background: 'rgba(181,165,90,0.15)', color: 'var(--status-inprogress)' }}>
            {validation.warnings.map((w, i) => <div key={i}>{w}</div>)}
          </div>
        )}
        {validation && !validation.valid && (
          <div className={`${styles.message} ${styles.error}`}>
            {validation.errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        <p className={styles.note}>
          {isSecondaryOnly
            ? t.share_overwrite_hideout_note
            : t.share_overwrite_note}
        </p>

        {msg && (
          <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>
            {msg.text}
          </div>
        )}

        <div className={styles.buttons}>
          {msg?.type === 'success' ? (
            <button onClick={() => navigate('/dashboard')}>{t.share_go_dashboard}</button>
          ) : (
            <>
              <button className={styles.btnPrimary} onClick={() => setConfirmOpen(true)}>
                {t.share_import_btn}
              </button>
              <button onClick={() => navigate('/dashboard')}>{t.common_cancel}</button>
            </>
          )}
        </div>
      </div>

      <Modal open={confirmOpen} title={t.share_confirm_title} onClose={() => setConfirmOpen(false)}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {isSecondaryOnly
            ? t.share_confirm_text_hideout
            : t.share_confirm_text}
        </p>
        <div className={styles.buttons}>
          <button className={styles.btnPrimary} onClick={handleImport}>{t.share_confirm_overwrite}</button>
          <button onClick={() => setConfirmOpen(false)}>{t.common_cancel}</button>
        </div>
      </Modal>
    </div>
  );
}
