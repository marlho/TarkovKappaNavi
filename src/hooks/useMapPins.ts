import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import type { MapPinRow, PinColor, PinShape } from '../db/types';
import { addMapPin as dbAddPin, updateMapPin as dbUpdatePin, deleteMapPin as dbDeletePin } from '../db/operations';

export function useMapPins(mapId: string | null, wipeId: string, viewMode: '2d' | '3d') {
  const [pins, setPins] = useState<MapPinRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!mapId || typeof wipeId !== 'string' || typeof viewMode !== 'string') {
      setPins([]);
      setLoading(false);
      return;
    }
    try {
      const rows = await db.mapPins.where('[mapId+wipeId+viewMode]').equals([mapId, wipeId, viewMode]).toArray();
      setPins(rows);
    } catch (e) {
      console.error('useMapPins refresh failed:', { mapId, wipeId, viewMode }, e);
      setPins([]);
    }
    setLoading(false);
  }, [mapId, wipeId, viewMode]);

  useEffect(() => {
    setLoading(true);
    refresh();

    const handler = () => { setTimeout(refresh, 0); };
    db.mapPins.hook('creating', handler);
    db.mapPins.hook('updating', handler);
    db.mapPins.hook('deleting', handler);

    return () => {
      db.mapPins.hook('creating').unsubscribe(handler);
      db.mapPins.hook('updating').unsubscribe(handler);
      db.mapPins.hook('deleting').unsubscribe(handler);
    };
  }, [refresh]);

  const addPin = useCallback(async (x: number, y: number, label: string, color: PinColor, shape: PinShape = 'circle') => {
    if (!mapId) return;
    await dbAddPin({ mapId, wipeId, viewMode, x, y, label, color, shape });
  }, [mapId, wipeId, viewMode]);

  const updatePin = useCallback(async (id: string, data: Partial<Pick<MapPinRow, 'label' | 'color' | 'shape' | 'x' | 'y'>>) => {
    await dbUpdatePin(id, data);
  }, []);

  const deletePin = useCallback(async (id: string) => {
    await dbDeletePin(id);
  }, []);

  return { pins, loading, addPin, updatePin, deletePin };
}
