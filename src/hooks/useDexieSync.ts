import { useEffect, useState } from 'react';
import { seedDatabase } from '../db/seed';
import { getProfile, getNowPins, setNowPins, upsertProfile } from '../db/operations';
import { useProfileStore } from '../stores/profileStore';
import { useNowPinsStore } from '../stores/nowPinsStore';

/**
 * マウント時: 必要ならDBをシード、その後IndexedDBからZustandストアをハイドレート。
 * Zustand変更時: Dexieに永続化。
 */
export function useDexieSync() {
  const [ready, setReady] = useState(false);

  // マウント時にハイドレート
  useEffect(() => {
    async function hydrate() {
      await seedDatabase();

      const profile = await getProfile();
      if (profile) {
        useProfileStore.getState().hydrate(profile.currentLevel, profile.wipeId, profile.autoStartUnlocked, profile.lang, profile.onboardingDone);
      }

      const pins = await getNowPins();
      useNowPinsStore.getState().hydrate(pins);
      setReady(true);
    }
    hydrate();
  }, []);

  // プロフィール変更をDexieに永続化
  useEffect(() => {
    const unsub = useProfileStore.subscribe((state, prev) => {
      if (
        state.currentLevel !== prev.currentLevel ||
        state.wipeId !== prev.wipeId ||
        state.autoStartUnlocked !== prev.autoStartUnlocked ||
        state.lang !== prev.lang ||
        state.onboardingDone !== prev.onboardingDone
      ) {
        upsertProfile({
          currentLevel: state.currentLevel,
          wipeId: state.wipeId,
          autoStartUnlocked: state.autoStartUnlocked,
          lang: state.lang,
          onboardingDone: state.onboardingDone,
        });
      }
    });
    return unsub;
  }, []);

  // Nowピンの変更をDexieに永続化
  useEffect(() => {
    const unsub = useNowPinsStore.subscribe((state, prev) => {
      if (state.taskIds !== prev.taskIds) {
        setNowPins(state.taskIds);
      }
    });
    return unsub;
  }, []);

  return { ready };
}
