import { db } from './database';

/** 初回起動時にデフォルトプロフィールが存在することを保証する */
export async function seedDatabase(): Promise<void> {
  const existing = await db.profile.get('me');
  if (!existing) {
    await db.profile.put({
      id: 'me',
      currentLevel: 1,
      wipeId: 'default',
      onboardingDone: false,
      updatedAt: Date.now(),
    });
  }

  const pins = await db.nowPins.get('me');
  if (!pins) {
    await db.nowPins.put({ id: 'me', taskIds: [] });
  }
}
