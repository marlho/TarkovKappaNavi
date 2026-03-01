import pako from 'pako';
import type { TaskStatus, ProgressRow, NowPins, Profile, HideoutProgressRow, MapPinRow, PinColor, PinShape } from '../db/types';

/** コンパクトピンタプル: [mapId, viewModeShort, label, colorShort, x, y, shapeShort?] */
export type CompactPin = [string, '2' | '3', string, string, number, number, string?];

/** コンパクトな共有データフォーマット */
export interface SharePayload {
  v: 1;
  l: number;       // currentLevel
  w: string;       // wipeId
  p: Record<string, 'd' | 'i'>; // taskId → ステータス省略形
  n: string[];     // NowピンのタスクID
  h?: string[];    // 建設済みハイドアウトlevelId（任意）
  m?: CompactPin[];  // マップピン（任意）
}

/** 2次共有ペイロード（ハイドアウト＋マップピン、分割QR時の2枚目用） */
interface HideoutSharePayload {
  v: 1;
  h: string[]; // 建設済みlevelIdリスト
  m?: CompactPin[];  // マップピン（任意）
}

/** デコード済み共有データ（インポート用） */
export interface DecodedShareData {
  level: number;
  wipeId: string;
  progressMap: Map<string, TaskStatus>;
  nowPinIds: string[];
  builtLevelIds: string[];
  mapPins: CompactPin[];
}

/** 2次データデコード結果（QR②用） */
export interface DecodedSecondaryData {
  builtLevelIds: string[];
  mapPins: CompactPin[];
}

const STATUS_TO_SHORT: Record<Exclude<TaskStatus, 'not_started'>, string> = {
  done: 'd',
  in_progress: 'i',
};

const SHORT_TO_STATUS: Record<string, TaskStatus> = {
  d: 'done',
  i: 'in_progress',
};

const COLOR_TO_SHORT: Record<PinColor, string> = {
  red: 'r', blue: 'b', yellow: 'y', green: 'g', purple: 'p', white: 'w',
};
const SHORT_TO_COLOR: Record<string, PinColor> = {
  r: 'red', b: 'blue', y: 'yellow', g: 'green', p: 'purple', w: 'white',
};
const VIEW_TO_SHORT: Record<'2d' | '3d', '2' | '3'> = { '2d': '2', '3d': '3' };
const SHORT_TO_VIEW: Record<string, '2d' | '3d'> = { '2': '2d', '3': '3d' };

const SHAPE_TO_SHORT: Record<PinShape, string> = {
  circle: 'c', diamond: 'd', square: 's', triangle: 't', star: 'x', marker: 'm',
};
const SHORT_TO_SHAPE: Record<string, PinShape> = {
  c: 'circle', d: 'diamond', s: 'square', t: 'triangle', x: 'star', m: 'marker',
};

function compactPins(pins: MapPinRow[]): CompactPin[] {
  return pins.map((pin) => {
    const shape = pin.shape ?? 'circle';
    // circle はデフォルトなので省略してサイズ節約
    const tuple: CompactPin = [
      pin.mapId,
      VIEW_TO_SHORT[pin.viewMode],
      pin.label,
      COLOR_TO_SHORT[pin.color],
      Math.round(pin.x * 10) / 10,
      Math.round(pin.y * 10) / 10,
    ];
    if (shape !== 'circle') tuple.push(SHAPE_TO_SHORT[shape]);
    return tuple;
  });
}

/** CompactPin[] → MapPinRow[]（インポート用） */
export function expandPins(compact: CompactPin[], wipeId: string): MapPinRow[] {
  const now = Date.now();
  return compact.map(([mapId, viewShort, label, colorShort, x, y, shapeShort]) => ({
    id: crypto.randomUUID(),
    mapId,
    wipeId,
    viewMode: SHORT_TO_VIEW[viewShort] ?? '3d',
    label,
    color: SHORT_TO_COLOR[colorShort] ?? 'red',
    shape: (shapeShort ? SHORT_TO_SHAPE[shapeShort] : undefined) ?? 'circle',
    x,
    y,
    createdAt: now,
    updatedAt: now,
  }));
}

/** 共有データをエンコード: JSON → deflate → base64url */
export function encodeShareData(
  profile: Pick<Profile, 'currentLevel' | 'wipeId'>,
  progressRows: ProgressRow[],
  nowPins: NowPins,
  hideoutRows: HideoutProgressRow[],
  mapPins: MapPinRow[],
): string {
  const p: Record<string, 'd' | 'i'> = {};
  for (const row of progressRows) {
    if (row.status !== 'not_started') {
      p[row.taskId] = STATUS_TO_SHORT[row.status] as 'd' | 'i';
    }
  }

  const h = hideoutRows.map((r) => r.levelId);
  const m = compactPins(mapPins);

  const payload: SharePayload = {
    v: 1,
    l: profile.currentLevel,
    w: profile.wipeId,
    p,
    n: nowPins.taskIds,
    ...(h.length > 0 ? { h } : {}),
    ...(m.length > 0 ? { m } : {}),
  };

  const json = JSON.stringify(payload);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return base64urlEncode(compressed);
}

/** タスクのみの共有データをエンコード（ハイドアウト/マップピンなし、分割QRモード用） */
export function encodeTaskOnlyData(
  profile: Pick<Profile, 'currentLevel' | 'wipeId'>,
  progressRows: ProgressRow[],
  nowPins: NowPins,
): string {
  const p: Record<string, 'd' | 'i'> = {};
  for (const row of progressRows) {
    if (row.status !== 'not_started') {
      p[row.taskId] = STATUS_TO_SHORT[row.status] as 'd' | 'i';
    }
  }

  const payload: SharePayload = {
    v: 1,
    l: profile.currentLevel,
    w: profile.wipeId,
    p,
    n: nowPins.taskIds,
  };

  const json = JSON.stringify(payload);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return base64urlEncode(compressed);
}

/** 2次データをエンコード（ハイドアウト＋マップピン、分割QRの2枚目用） */
export function encodeSecondaryData(
  hideoutRows: HideoutProgressRow[],
  mapPins: MapPinRow[],
): string {
  const m = compactPins(mapPins);
  const payload: HideoutSharePayload = {
    v: 1,
    h: hideoutRows.map((r) => r.levelId),
    ...(m.length > 0 ? { m } : {}),
  };
  const json = JSON.stringify(payload);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return base64urlEncode(compressed);
}

/** 共有データをデコード: base64url → inflate → JSON */
export function decodeShareData(encoded: string): DecodedShareData {
  const bytes = base64urlDecode(encoded);
  const json = new TextDecoder().decode(pako.inflate(bytes));
  const payload = JSON.parse(json) as SharePayload;

  if (payload.v !== 1) {
    throw new Error(`Unsupported share format version: ${payload.v}`);
  }

  const progressMap = new Map<string, TaskStatus>();
  for (const [taskId, short] of Object.entries(payload.p)) {
    const status = SHORT_TO_STATUS[short];
    if (status) {
      progressMap.set(taskId, status);
    }
  }

  return {
    level: payload.l,
    wipeId: payload.w,
    progressMap,
    nowPinIds: payload.n ?? [],
    builtLevelIds: payload.h ?? [],
    mapPins: payload.m ?? [],
  };
}

/** 2次データをデコード: ハイドアウトlevelIdとマップピンを返す */
export function decodeSecondaryData(encoded: string): DecodedSecondaryData {
  const bytes = base64urlDecode(encoded);
  const json = new TextDecoder().decode(pako.inflate(bytes));
  const payload = JSON.parse(json) as HideoutSharePayload;
  return {
    builtLevelIds: payload.h ?? [],
    mapPins: payload.m ?? [],
  };
}

/** 完全な共有URLを構築（タスク＋任意のハイドアウト＋マップピン） */
export function buildShareUrl(encoded: string): string {
  return `${window.location.origin}/share?d=${encoded}`;
}

/** 2次共有URLを構築（ハイドアウト＋マップピン、分割QRの2枚目用） */
export function buildSecondaryShareUrl(encoded: string): string {
  return `${window.location.origin}/share?h=${encoded}`;
}

// --- base64urlヘルパー ---

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64urlDecode(str: string): Uint8Array {
  // 標準base64に復元
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // パディングを追加
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** QRコードの最大容量（バイト単位、バージョン40、低ECCレベル、バイナリモード） */
export const QR_MAX_BYTES = 2953;

// --- データ整合性チェック ---

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * エンコード済みSharePayloadのデータ整合性を検証する。
 * APIデータとの突合はUIレイヤーで実施。
 */
export function validateSharePayload(encoded: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. デコード
  let raw: unknown;
  try {
    const bytes = base64urlDecode(encoded);
    const json = new TextDecoder().decode(pako.inflate(bytes));
    raw = JSON.parse(json);
  } catch {
    return { valid: false, errors: ['データのデコードに失敗しました（破損またはフォーマット不正）'], warnings: [] };
  }

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['データ構造が不正です'], warnings: [] };
  }

  const data = raw as Record<string, unknown>;

  // 2. バージョン
  if (data.v !== 1) {
    errors.push(`不明なバージョン: ${String(data.v)}`);
  }

  // 3. レベル
  if (typeof data.l !== 'number' || data.l < 1 || data.l > 79 || !Number.isInteger(data.l)) {
    errors.push(`レベルが無効です: ${String(data.l)}（1〜79の整数が必要）`);
  }

  // 4. wipeId
  if (typeof data.w !== 'string' || data.w.length === 0) {
    errors.push('wipeIdが空です');
  }

  // 5. 進捗マップ
  if (typeof data.p !== 'object' || data.p === null || Array.isArray(data.p)) {
    errors.push('進捗データの構造が不正です');
  } else {
    const progress = data.p as Record<string, unknown>;
    const entries = Object.entries(progress);
    let invalidCount = 0;
    for (const [, v] of entries) {
      if (v !== 'd' && v !== 'i') invalidCount++;
    }
    if (invalidCount > 0) {
      warnings.push(`${invalidCount}件の不正なステータス値があります（d/i以外）`);
    }
  }

  // 6. NowPins
  if (!Array.isArray(data.n)) {
    errors.push('Nowピンデータの構造が不正です');
  }

  // 7. ハイドアウト（optional）
  if (data.h !== undefined && !Array.isArray(data.h)) {
    warnings.push('ハイドアウトデータの構造が不正です');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
