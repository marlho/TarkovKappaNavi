import pako from 'pako';
import { base64urlEncode, base64urlDecode } from './qrShare';

/** デコード時に返すピン（id, wipeId, createdAt, updatedAt は含まない） */
export interface DecodedPin {
  mapId: string;
  viewMode: '2d' | '3d';
  label: string;
  color: string;
  shape: string;
  x: number;
  y: number;
}

/** CompactPin 形式: [mapId, viewMode, label, color, shape, x, y] */
type PresetCompactPin = [string, string, string, string, string, number, number];

interface PresetPayload {
  n: string; // プリセット名
  p: PresetCompactPin[];
}

/** ピン配列をプリセット用にエンコード（MapPinRow または DecodedPin 互換） */
export function encodePinPreset(name: string, pins: { mapId: string; viewMode: string; label: string; color: string; shape?: string | null; x: number; y: number }[]): string {
  const compact: PresetCompactPin[] = pins.map((pin) => [
    pin.mapId,
    pin.viewMode,
    pin.label,
    pin.color,
    pin.shape ?? 'circle',
    Math.round(pin.x * 10) / 10,
    Math.round(pin.y * 10) / 10,
  ]);

  const payload: PresetPayload = { n: name, p: compact };
  const json = JSON.stringify(payload);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return base64urlEncode(compressed);
}

/** エンコード済み文字列をデコード */
export function decodePinPreset(encoded: string): { name: string; pins: DecodedPin[] } {
  const bytes = base64urlDecode(encoded);
  const json = new TextDecoder().decode(pako.inflate(bytes));
  const payload = JSON.parse(json) as PresetPayload;

  const pins: DecodedPin[] = payload.p.map(([mapId, viewMode, label, color, shape, x, y]) => ({
    mapId,
    viewMode: viewMode === '2d' ? '2d' : '3d',
    label,
    color,
    shape: shape || 'circle',
    x,
    y,
  }));

  return { name: payload.n, pins };
}

/** プリセット共有URLを生成 */
export function buildPinPresetUrl(encoded: string): string {
  return `${window.location.origin}/map/preset?p=${encoded}`;
}
