import { useState, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import type { MapPinRow, PinPresetRow } from '../../db/types';
import { bulkAddMapPins } from '../../db/operations';
import { db } from '../../db/database';
import { encodePinPreset, buildPinPresetUrl } from '../../lib/pinPreset';
import { useProfileStore } from '../../stores/profileStore';
import { usePinPresets } from '../../hooks/usePinPresets';
import { useT } from '../../i18n';
import { Modal } from '../ui/Modal';
import styles from './PinPresetList.module.css';

interface PinPresetListProps {
  pins: MapPinRow[];
}

export function PinPresetList({ pins }: PinPresetListProps) {
  const t = useT();
  const wipeId = useProfileStore((s) => s.wipeId);
  const { presets, addPreset, deletePreset } = usePinPresets();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 共有モーダル
  const [sharePreset, setSharePreset] = useState<PinPresetRow | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim() || pins.length === 0) return;
    const presetPins: PinPresetRow['pins'] = pins.map((p) => ({
      mapId: p.mapId,
      viewMode: p.viewMode,
      label: p.label,
      color: p.color,
      shape: p.shape ?? 'circle',
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
    await addPreset(name.trim(), presetPins);
    setName('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [name, pins, addPreset]);

  const handleApply = useCallback(async (preset: PinPresetRow) => {
    const now = Date.now();
    const rows: Omit<MapPinRow, 'id'>[] = preset.pins.map((p) => ({
      mapId: p.mapId,
      wipeId,
      viewMode: p.viewMode,
      label: p.label,
      color: p.color as MapPinRow['color'],
      shape: (p.shape || 'circle') as MapPinRow['shape'],
      x: p.x,
      y: p.y,
      createdAt: now,
      updatedAt: now,
    }));
    await bulkAddMapPins(rows);
  }, [wipeId]);

  const handleRemove = useCallback(async (preset: PinPresetRow) => {
    const idsToDelete: string[] = [];
    for (const pp of preset.pins) {
      try {
        const matches = await db.mapPins
          .where('[mapId+wipeId+viewMode]')
          .equals([pp.mapId, wipeId, pp.viewMode])
          .toArray();
        for (const mp of matches) {
          if (
            mp.label === pp.label &&
            mp.color === pp.color &&
            (mp.shape ?? 'circle') === (pp.shape || 'circle') &&
            Math.abs(mp.x - pp.x) < 0.5 &&
            Math.abs(mp.y - pp.y) < 0.5
          ) {
            idsToDelete.push(mp.id);
          }
        }
      } catch { /* skip */ }
    }
    if (idsToDelete.length > 0) {
      await db.mapPins.bulkDelete(idsToDelete);
    }
  }, [wipeId]);

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDeleteId) return;
    await deletePreset(confirmDeleteId);
    setConfirmDeleteId(null);
  }, [confirmDeleteId, deletePreset]);

  const handleDeleteCancel = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  // 共有モーダルを開く
  const handleShareClick = useCallback((preset: PinPresetRow) => {
    const encoded = encodePinPreset(preset.name, preset.pins);
    const url = buildPinPresetUrl(encoded);
    setSharePreset(preset);
    setShareUrl(url);
    setCopied(false);
  }, []);

  const handleShareClose = useCallback(() => {
    setSharePreset(null);
    setShareUrl(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.sectionTitle}>{t.pin_preset_list_title}</span>

      {pins.length > 0 && (
        <div className={styles.saveRow}>
          <input
            type="text"
            className={styles.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.pin_preset_name_placeholder}
            maxLength={30}
          />
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {saved ? t.pin_preset_save_done : t.pin_preset_save}
          </button>
        </div>
      )}

      {presets.length === 0 ? (
        <div className={styles.empty}>{t.pin_preset_empty}</div>
      ) : (
        <div className={styles.list}>
          {presets.map((preset) => (
            <div key={preset.id} className={styles.presetRow}>
              <span className={styles.presetName} title={preset.name}>{preset.name}</span>
              <span className={styles.presetCount}>
                {t.pin_preset_pins_short.replace('{count}', String(preset.pins.length))}
              </span>
              <button
                className={styles.shareBtn}
                onClick={() => handleShareClick(preset)}
                title={t.pin_preset_generate}
              >
                <Share2 size={13} />
              </button>
              <button
                className={styles.applyBtn}
                onClick={() => handleApply(preset)}
              >
                {t.pin_preset_apply}
              </button>
              <button
                className={styles.removeBtn}
                onClick={() => handleRemove(preset)}
              >
                {t.pin_preset_remove}
              </button>
              {confirmDeleteId === preset.id ? (
                <>
                  <button className={styles.deleteBtn} onClick={handleDeleteConfirm}>
                    OK
                  </button>
                  <button className={styles.removeBtn} onClick={handleDeleteCancel}>
                    ✕
                  </button>
                </>
              ) : (
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteClick(preset.id)}
                >
                  {t.pin_preset_delete}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 共有モーダル */}
      <Modal open={!!sharePreset} onClose={handleShareClose} title={t.pin_preset_generate}>
        {sharePreset && shareUrl && (
          <div className={styles.shareModal}>
            <div className={styles.sharePresetName}>{sharePreset.name}</div>
            <div className={styles.shareCount}>
              {t.pin_preset_pins_short.replace('{count}', String(sharePreset.pins.length))}
            </div>
            <input
              type="text"
              className={styles.shareUrlInput}
              value={shareUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button className={styles.shareCopyBtn} onClick={handleCopy}>
              {copied ? t.pin_preset_copied : t.pin_preset_copy}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
