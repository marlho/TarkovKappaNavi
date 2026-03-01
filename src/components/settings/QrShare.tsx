import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../db/database';
import {
  encodeShareData,
  encodeTaskOnlyData,
  encodeSecondaryData,
  buildShareUrl,
  buildSecondaryShareUrl,
  QR_MAX_BYTES,
} from '../../lib/qrShare';
import { useT } from '../../i18n';
import styles from './QrShare.module.css';

type Msg = { type: 'success' | 'error'; text: string } | null;

type QrResult =
  | { mode: 'single'; url: string; dataSize: number }
  | { mode: 'split'; taskUrl: string; taskDataSize: number; hideoutUrl: string; hideoutDataSize: number }
  | null;

export function QrShare() {
  const [qrResult, setQrResult] = useState<QrResult>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const t = useT();

  const handleGenerate = async () => {
    try {
      const profile = await db.profile.get('me');
      if (!profile) {
        setMsg({ type: 'error', text: t.qr_no_profile });
        return;
      }

      const progressRows = await db.progress.toArray();
      const nowPins = (await db.nowPins.get('me')) ?? { id: 'me', taskIds: [] };
      const hideoutRows = await db.hideoutProgress.toArray();
      const mapPins = await db.mapPins.toArray();

      // タスク+ハイドアウト+マップピン合わせてエンコードし容量チェック
      const combined = encodeShareData(profile, progressRows, nowPins, hideoutRows, mapPins);

      if (combined.length <= QR_MAX_BYTES) {
        // 1枚のQRに収まる
        setQrResult({ mode: 'single', url: buildShareUrl(combined), dataSize: combined.length });
        setMsg(null);
      } else {
        // 容量超過 → 2枚に分割
        const taskEncoded = encodeTaskOnlyData(profile, progressRows, nowPins);
        const secondaryEncoded = encodeSecondaryData(hideoutRows, mapPins);

        if (taskEncoded.length > QR_MAX_BYTES) {
          setMsg({ type: 'error', text: t.qr_too_large });
          setQrResult(null);
          return;
        }

        if (secondaryEncoded.length > QR_MAX_BYTES) {
          setMsg({ type: 'error', text: t.qr_secondary_too_large });
          setQrResult(null);
          return;
        }

        setQrResult({
          mode: 'split',
          taskUrl: buildShareUrl(taskEncoded),
          taskDataSize: taskEncoded.length,
          hideoutUrl: buildSecondaryShareUrl(secondaryEncoded),
          hideoutDataSize: secondaryEncoded.length,
        });
        setMsg(null);
      }
    } catch (e) {
      setMsg({ type: 'error', text: t.qr_generate_failed.replace('{error}', String(e)) });
      setQrResult(null);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate}>{t.qr_generate}</button>

      {msg && (
        <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>
          {msg.text}
        </div>
      )}

      {qrResult?.mode === 'single' && (
        <div className={styles.qrContainer}>
          <div className={styles.qrLabel}>{t.qr_tasks_hideout}</div>
          <QRCodeSVG value={qrResult.url} size={256} level="L" />
          <div className={styles.sizeInfo}>
            {t.qr_data_size.replace('{size}', String(qrResult.dataSize)).replace('{max}', String(QR_MAX_BYTES))}
          </div>
          {qrResult.dataSize > QR_MAX_BYTES * 0.8 && (
            <div className={styles.warning}>
              {t.qr_size_warning}
            </div>
          )}
        </div>
      )}

      {qrResult?.mode === 'split' && (
        <div className={styles.splitContainer}>
          <p className={styles.splitNote}>
            {t.qr_split_notice}<br />
            {t.qr_split_instruction}
          </p>

          <div className={styles.qrContainer}>
            <div className={styles.qrLabel}>{t.qr_part1_title}</div>
            <QRCodeSVG value={qrResult.taskUrl} size={256} level="L" />
            <div className={styles.sizeInfo}>
              {t.qr_data_size.replace('{size}', String(qrResult.taskDataSize)).replace('{max}', String(QR_MAX_BYTES))}
            </div>
          </div>

          <div className={styles.qrContainer}>
            <div className={styles.qrLabel}>{t.qr_part2_title}</div>
            <QRCodeSVG value={qrResult.hideoutUrl} size={256} level="L" />
            <div className={styles.sizeInfo}>
              {t.qr_data_size.replace('{size}', String(qrResult.hideoutDataSize)).replace('{max}', String(QR_MAX_BYTES))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
