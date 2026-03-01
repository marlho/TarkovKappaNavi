/** タスクステータスの遷移 */
export type TaskStatus = 'not_started' | 'in_progress' | 'done';

/** ユーザープロフィール — 単一行、idは常に"me" */
export interface Profile {
  id: string;          // 常に"me"
  currentLevel: number; // 1–79
  wipeId: string;
  autoStartUnlocked?: boolean; // 前提完了時に自動Start
  lang?: 'ja' | 'en';  // UI/API言語
  onboardingDone?: boolean;    // 初回オンボーディング完了フラグ
  updatedAt: number;   // エポックミリ秒
}

/** タスクごとの進捗 */
export interface ProgressRow {
  taskId: string;
  status: TaskStatus;
  completedAt: number | null; // エポックミリ秒、未完了ならnull
  updatedAt: number;          // エポックミリ秒
}

/** ピン留めされた「Now」タスク — 単一行、idは常に"me" */
export interface NowPins {
  id: string;         // 常に"me"
  taskIds: string[];  // 最大10件
}

/** タスクごとのメモ */
export interface NoteRow {
  taskId: string;
  text: string;
  updatedAt: number; // エポックミリ秒
}

/** ハイドアウトステーションレベルの進捗 */
export interface HideoutProgressRow {
  levelId: string;
  stationId: string;
  level: number;
  builtAt: number; // エポックミリ秒
}

/** ピンの色 */
export type PinColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'white';

/** ピンの形状 */
export type PinShape = 'circle' | 'diamond' | 'square' | 'triangle' | 'star' | 'marker';

/** ユーザーマップピン */
export interface MapPinRow {
  id: string;           // crypto.randomUUID()
  mapId: string;        // tarkov.dev の mapId
  wipeId: string;       // Profile.wipeId に紐づけ
  viewMode: '2d' | '3d'; // ビューモード別管理
  label: string;        // 自由テキスト（最大100文字）
  color: PinColor;
  shape: PinShape;      // ピン形状
  x: number;            // 0-100 (%)
  y: number;            // 0-100 (%)
  createdAt: number;
  updatedAt: number;
}

/** ハイドアウトアイテムインベントリ（アイテム単位のグローバル在庫）— 旧形式、移行用に残存 */
export interface HideoutItemInventoryRow {
  itemId: string;     // ItemRequirement.itemId
  ownedCount: number; // 所持数（0以上）
}

/** ハイドアウトレベル別アイテムインベントリ */
export interface HideoutLevelInventoryRow {
  levelId: string;     // HideoutLevelModel.id
  itemId: string;      // ItemRequirement.itemId
  ownedCount: number;  // 所持数（0以上）
}

/** 保存済みピンプリセット */
export interface PinPresetRow {
  id: string;          // crypto.randomUUID()
  name: string;
  pins: Array<{
    mapId: string;
    viewMode: '2d' | '3d';
    label: string;
    color: string;
    shape: string;
    x: number;
    y: number;
  }>;
  createdAt: number;
}

/** ステータス遷移の監査ログ */
export interface ProgressLog {
  id?: number;        // 自動インクリメント
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
  at: number;         // エポックミリ秒
  reason: string;     // 例: "manual", "bulk_prereq_complete"
}
