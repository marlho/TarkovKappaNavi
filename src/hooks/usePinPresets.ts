import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import type { PinPresetRow } from '../db/types';
import { getAllPinPresets, addPinPreset as dbAdd, deletePinPreset as dbDelete } from '../db/operations';

export function usePinPresets() {
  const [presets, setPresets] = useState<PinPresetRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const rows = await getAllPinPresets();
      setPresets(rows);
    } catch (e) {
      console.error('usePinPresets refresh failed:', e);
      setPresets([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => { setTimeout(refresh, 0); };
    db.pinPresets.hook('creating', handler);
    db.pinPresets.hook('deleting', handler);
    return () => {
      db.pinPresets.hook('creating').unsubscribe(handler);
      db.pinPresets.hook('deleting').unsubscribe(handler);
    };
  }, [refresh]);

  const addPreset = useCallback(async (name: string, pins: PinPresetRow['pins']) => {
    await dbAdd(name, pins);
  }, []);

  const deletePreset = useCallback(async (id: string) => {
    await dbDelete(id);
  }, []);

  return { presets, addPreset, deletePreset };
}
