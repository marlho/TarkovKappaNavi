import { db } from './database';
import type { Profile, ProgressRow, NoteRow, ProgressLog, TaskStatus, HideoutProgressRow, MapPinRow, HideoutItemInventoryRow, HideoutLevelInventoryRow, PinPresetRow } from './types';

// ─── Profile ───

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('me');
}

export async function upsertProfile(data: Partial<Omit<Profile, 'id'>>): Promise<void> {
  const now = Date.now();
  const existing = await db.profile.get('me');
  if (existing) {
    await db.profile.update('me', { ...data, updatedAt: now });
  } else {
    await db.profile.put({
      id: 'me',
      currentLevel: 1,
      wipeId: 'default',
      updatedAt: now,
      ...data,
    });
  }
}

// ─── Progress ───

export async function getProgress(taskId: string): Promise<ProgressRow | undefined> {
  return db.progress.get(taskId);
}

export async function getAllProgress(): Promise<ProgressRow[]> {
  return db.progress.toArray();
}

export async function updateTaskStatus(
  taskId: string,
  to: TaskStatus,
  reason = 'manual',
): Promise<void> {
  const now = Date.now();
  const existing = await db.progress.get(taskId);
  const from: TaskStatus = existing?.status ?? 'not_started';

  await db.transaction('rw', [db.progress, db.logs], async () => {
    await db.progress.put({
      taskId,
      status: to,
      completedAt: to === 'done' ? now : null,
      updatedAt: now,
    });

    await db.logs.add({
      taskId,
      from,
      to,
      at: now,
      reason,
    });
  });
}

/**
 * タスクとその前提タスクチェーンを単一トランザクションで一括完了する。
 * 完了したタスクはすべて同一のcompletedAtタイムスタンプを共有する。
 * prereqIdsはDFS（domain/prereqTree）で事前に算出しておくこと。
 */
export async function bulkCompleteWithPrereqs(
  taskId: string,
  prereqIds: string[],
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.progress, db.logs], async () => {
    // まず前提タスクを完了
    for (const pid of prereqIds) {
      const existing = await db.progress.get(pid);
      const from: TaskStatus = existing?.status ?? 'not_started';
      if (from === 'done') continue;

      await db.progress.put({
        taskId: pid,
        status: 'done',
        completedAt: now,
        updatedAt: now,
      });
      await db.logs.add({
        taskId: pid,
        from,
        to: 'done',
        at: now,
        reason: 'bulk_prereq_complete',
      });
    }

    // 対象タスクを完了
    const existing = await db.progress.get(taskId);
    const from: TaskStatus = existing?.status ?? 'not_started';
    await db.progress.put({
      taskId,
      status: 'done',
      completedAt: now,
      updatedAt: now,
    });
    await db.logs.add({
      taskId,
      from,
      to: 'done',
      at: now,
      reason: 'manual',
    });
  });
}

/**
 * 自動Startバッチ処理。
 * not_startedのタスクをin_progressに変更し、ログを記録する。
 */
export async function batchAutoStart(taskIds: string[]): Promise<void> {
  if (taskIds.length === 0) return;
  const now = Date.now();
  await db.transaction('rw', [db.progress, db.logs], async () => {
    for (const taskId of taskIds) {
      const existing = await db.progress.get(taskId);
      const from: TaskStatus = existing?.status ?? 'not_started';
      if (from !== 'not_started') continue;
      await db.progress.put({
        taskId,
        status: 'in_progress',
        completedAt: null,
        updatedAt: now,
      });
      await db.logs.add({
        taskId,
        from,
        to: 'in_progress',
        at: now,
        reason: 'auto_start',
      });
    }
  });
}

// ─── Now Pins ───

export async function getNowPins(): Promise<string[]> {
  const row = await db.nowPins.get('me');
  return row?.taskIds ?? [];
}

export async function setNowPins(taskIds: string[]): Promise<void> {
  await db.nowPins.put({ id: 'me', taskIds: taskIds.slice(0, 3) });
}

export async function addNowPin(taskId: string): Promise<boolean> {
  const current = await getNowPins();
  if (current.length >= 3 || current.includes(taskId)) return false;
  await setNowPins([...current, taskId]);
  return true;
}

export async function removeNowPin(taskId: string): Promise<void> {
  const current = await getNowPins();
  await setNowPins(current.filter((id) => id !== taskId));
}

// ─── Notes ───

export async function getNote(taskId: string): Promise<NoteRow | undefined> {
  return db.notes.get(taskId);
}

export async function upsertNote(taskId: string, text: string): Promise<void> {
  await db.notes.put({ taskId, text, updatedAt: Date.now() });
}

// ─── Logs ───

export async function getLogsByTask(taskId: string): Promise<ProgressLog[]> {
  return db.logs.where('taskId').equals(taskId).sortBy('at');
}

export async function getAllLogs(): Promise<ProgressLog[]> {
  return db.logs.orderBy('at').toArray();
}

// ─── Hideout Progress ───

export async function getAllHideoutProgress(): Promise<HideoutProgressRow[]> {
  return db.hideoutProgress.toArray();
}

export async function buildHideoutLevel(
  levelId: string,
  stationId: string,
  level: number,
): Promise<void> {
  await db.hideoutProgress.put({
    levelId,
    stationId,
    level,
    builtAt: Date.now(),
  });
}

export async function unbuildHideoutLevel(levelId: string): Promise<void> {
  await db.hideoutProgress.delete(levelId);
}

/**
 * 指定レベル以上のステーションレベルを全てunbuildする。
 * レベルを戻す場合に上位レベルも一緒に削除する。
 */
export async function unbuildHideoutLevelAndAbove(
  stationId: string,
  fromLevel: number,
): Promise<void> {
  const rows = await db.hideoutProgress
    .where('stationId')
    .equals(stationId)
    .toArray();

  const toDelete = rows.filter((r) => r.level >= fromLevel).map((r) => r.levelId);
  if (toDelete.length > 0) {
    await db.hideoutProgress.bulkDelete(toDelete);
  }
}

// ─── Map Pins ───

export async function getMapPinsByMap(mapId: string, wipeId: string, viewMode: '2d' | '3d'): Promise<MapPinRow[]> {
  return db.mapPins.where('[mapId+wipeId+viewMode]').equals([mapId, wipeId, viewMode]).toArray();
}

export async function addMapPin(pin: Omit<MapPinRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.mapPins.put({ ...pin, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateMapPin(id: string, data: Partial<Pick<MapPinRow, 'label' | 'color' | 'shape' | 'x' | 'y'>>): Promise<void> {
  await db.mapPins.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteMapPin(id: string): Promise<void> {
  await db.mapPins.delete(id);
}

export async function bulkAddMapPins(pins: Omit<MapPinRow, 'id'>[]): Promise<void> {
  const rows = pins.map((pin) => ({
    ...pin,
    id: crypto.randomUUID(),
  }));
  await db.mapPins.bulkPut(rows);
}

// ─── Pin Presets ───

export async function getAllPinPresets(): Promise<PinPresetRow[]> {
  return db.pinPresets.orderBy('createdAt').reverse().toArray();
}

export async function addPinPreset(name: string, pins: PinPresetRow['pins']): Promise<string> {
  const id = crypto.randomUUID();
  await db.pinPresets.put({ id, name, pins, createdAt: Date.now() });
  return id;
}

export async function deletePinPreset(id: string): Promise<void> {
  await db.pinPresets.delete(id);
}

// ─── Hideout Item Inventory (旧グローバル — 移行用) ───

export async function getAllHideoutItemInventory(): Promise<HideoutItemInventoryRow[]> {
  return db.hideoutInventory.toArray();
}

export async function clearOldHideoutInventory(): Promise<void> {
  await db.hideoutInventory.clear();
}

// ─── Hideout Level Inventory (レベル別) ───

export async function setHideoutLevelItemCount(
  levelId: string,
  itemId: string,
  ownedCount: number,
): Promise<void> {
  const clamped = Math.max(0, ownedCount);
  await db.hideoutLevelInventory.put({ levelId, itemId, ownedCount: clamped });
}

export async function getAllHideoutLevelInventory(): Promise<HideoutLevelInventoryRow[]> {
  return db.hideoutLevelInventory.toArray();
}

/**
 * 指定アイテムの全レベル分の在庫をクリア（サマリMIN用）
 */
export async function clearHideoutLevelItemsByItemId(itemId: string): Promise<void> {
  await db.hideoutLevelInventory.where('itemId').equals(itemId).delete();
}

/**
 * グローバル在庫をレベル別に振り分けるワンタイム移行関数。
 * levelEntries: 振り分け先レベル情報（グリッドソート順）
 */
export async function migrateGlobalToLevelInventory(
  levelEntries: Array<{ levelId: string; itemId: string; count: number }>,
): Promise<void> {
  const oldRows = await db.hideoutInventory.toArray();
  if (oldRows.length === 0) return;

  const globalMap = new Map<string, number>();
  for (const r of oldRows) {
    globalMap.set(r.itemId, r.ownedCount);
  }

  const newRows: HideoutLevelInventoryRow[] = [];
  // 各アイテムの残り在庫を追跡
  const remaining = new Map(globalMap);

  for (const entry of levelEntries) {
    const avail = remaining.get(entry.itemId) ?? 0;
    if (avail <= 0) continue;
    const allocated = Math.min(avail, entry.count);
    newRows.push({ levelId: entry.levelId, itemId: entry.itemId, ownedCount: allocated });
    remaining.set(entry.itemId, avail - allocated);
  }

  await db.transaction('rw', [db.hideoutLevelInventory, db.hideoutInventory], async () => {
    if (newRows.length > 0) {
      await db.hideoutLevelInventory.bulkPut(newRows);
    }
    await db.hideoutInventory.clear();
  });
}
