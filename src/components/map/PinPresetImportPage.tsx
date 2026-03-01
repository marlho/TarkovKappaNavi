import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { decodePinPreset, type DecodedPin } from '../../lib/pinPreset';
import { bulkAddMapPins, addPinPreset } from '../../db/operations';
import { useProfileStore } from '../../stores/profileStore';
import { useMaps } from '../../api/hooks';
import { useT } from '../../i18n';
import styles from './PinPresetImportPage.module.css';

export function PinPresetImportPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const wipeId = useProfileStore((s) => s.wipeId);
  const { data: maps } = useMaps();

  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pParam = searchParams.get('p');

  const decoded = useMemo<{ name: string; pins: DecodedPin[] } | null>(() => {
    if (!pParam) return null;
    try {
      return decodePinPreset(pParam);
    } catch {
      return null;
    }
  }, [pParam]);

  // mapId → マップ名のルックアップ
  const mapNameLookup = useMemo(() => {
    const m = new Map<string, string>();
    if (maps) {
      for (const map of maps) {
        m.set(map.id, map.name);
      }
    }
    return m;
  }, [maps]);

  // マップ別の内訳
  const mapBreakdown = useMemo(() => {
    if (!decoded) return [];
    const counts = new Map<string, number>();
    for (const pin of decoded.pins) {
      counts.set(pin.mapId, (counts.get(pin.mapId) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [decoded]);

  const handleImport = async () => {
    if (!decoded) return;
    setImporting(true);
    try {
      const now = Date.now();
      const pins = decoded.pins.map((pin) => ({
        mapId: pin.mapId,
        wipeId,
        viewMode: pin.viewMode,
        label: pin.label,
        color: pin.color as 'red' | 'blue' | 'green' | 'yellow' | 'white',
        shape: pin.shape as 'circle' | 'diamond' | 'star',
        x: pin.x,
        y: pin.y,
        createdAt: now,
        updatedAt: now,
      }));
      await bulkAddMapPins(pins);
      // プリセットとしても保存
      await addPinPreset(decoded.name, decoded.pins.map((p) => ({
        mapId: p.mapId,
        viewMode: p.viewMode,
        label: p.label,
        color: p.color,
        shape: p.shape || 'circle',
        x: p.x,
        y: p.y,
      })));
      setDone(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  };

  if (!pParam) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.note}>{t.pin_preset_no_data}</p>
          <button className={styles.btn} onClick={() => navigate('/map')}>
            {t.pin_preset_go_map}
          </button>
        </div>
      </div>
    );
  }

  if (!decoded) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.note}>{t.pin_preset_invalid}</p>
          <button className={styles.btn} onClick={() => navigate('/map')}>
            {t.pin_preset_go_map}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>{t.pin_preset_import_title}</h2>

        <div className={styles.summary}>
          <div className={styles.presetName}>{decoded.name}</div>
          <div className={styles.stat}>
            {t.pin_preset_pin_count.replace('{count}', String(decoded.pins.length))}
          </div>
          {mapBreakdown.map(([mapId, count]) => (
            <div key={mapId} className={styles.mapRow}>
              <span className={styles.mapId}>{mapNameLookup.get(mapId) || mapId}</span>
              <span className={styles.mapCount}>{count}</span>
            </div>
          ))}
        </div>

        <p className={styles.note}>
          {t.pin_preset_add_note}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.buttons}>
          {done ? (
            <button className={styles.btnPrimary} onClick={() => navigate('/map')}>
              {t.pin_preset_go_map}
            </button>
          ) : (
            <>
              <button
                className={styles.btnPrimary}
                onClick={handleImport}
                disabled={importing}
              >
                {importing
                  ? (t.pin_preset_importing)
                  : (t.pin_preset_add_btn)}
              </button>
              <button className={styles.btn} onClick={() => navigate('/map')}>
                {t.common_cancel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
