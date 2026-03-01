import { z } from 'zod';

const taskStatusSchema = z.enum(['not_started', 'in_progress', 'done']);

export const profileSchema = z.object({
  id: z.string(),
  currentLevel: z.number().int().min(1).max(79),
  wipeId: z.string().default('default'),
  autoStartUnlocked: z.boolean().optional(),
  updatedAt: z.number(),
});

export const progressRowSchema = z.object({
  taskId: z.string(),
  status: taskStatusSchema,
  completedAt: z.number().nullable(),
  updatedAt: z.number(),
});

export const nowPinsSchema = z.object({
  id: z.string(),
  taskIds: z.array(z.string()).max(3),
});

export const noteRowSchema = z.object({
  taskId: z.string(),
  text: z.string(),
  updatedAt: z.number(),
});

export const progressLogSchema = z.object({
  id: z.number().optional(),
  taskId: z.string(),
  from: taskStatusSchema,
  to: taskStatusSchema,
  at: z.number(),
  reason: z.string(),
});

export const hideoutProgressRowSchema = z.object({
  levelId: z.string(),
  stationId: z.string(),
  level: z.number().int().min(0),
  builtAt: z.number(),
});

export const pinColorSchema = z.enum(['red', 'blue', 'yellow', 'green', 'purple', 'white']);
export const pinShapeSchema = z.enum(['circle', 'diamond', 'square', 'triangle', 'star', 'marker']);

export const mapPinRowSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  wipeId: z.string().default('default'),
  viewMode: z.enum(['2d', '3d']).default('3d'),
  label: z.string().max(100),
  color: pinColorSchema,
  shape: pinShapeSchema.default('circle'),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/** レベル別インベントリスキーマ（現行形式） */
export const hideoutLevelInventoryRowSchema = z.object({
  levelId: z.string(),
  itemId: z.string(),
  ownedCount: z.number().int().min(0),
});

/** 旧グローバル形式のインベントリスキーマ（インポート互換用） */
const legacyGlobalInventoryRowSchema = z.object({
  itemId: z.string(),
  ownedCount: z.number().int().min(0),
});

/** 全ストアのエクスポート/インポート用スキーマ */
export const exportDataSchema = z.object({
  profile: profileSchema,
  progress: z.array(progressRowSchema),
  nowPins: nowPinsSchema,
  notes: z.array(noteRowSchema),
  logs: z.array(progressLogSchema),
  hideoutProgress: z.array(hideoutProgressRowSchema).optional(),
  mapPins: z.array(mapPinRowSchema).optional(),
  hideoutItemInventory: z.array(
    z.union([hideoutLevelInventoryRowSchema, legacyGlobalInventoryRowSchema]),
  ).optional(),
});

export type ExportData = z.infer<typeof exportDataSchema>;
