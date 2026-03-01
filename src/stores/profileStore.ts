import { create } from 'zustand';
import type { Lang } from '../i18n/types';

interface ProfileState {
  currentLevel: number;
  wipeId: string;
  autoStartUnlocked: boolean;
  lang: Lang;
  onboardingDone: boolean;
  setLevel: (level: number) => void;
  setWipeId: (wipeId: string) => void;
  setAutoStart: (enabled: boolean) => void;
  setLang: (lang: Lang) => void;
  setOnboardingDone: (done: boolean) => void;
  hydrate: (level: number, wipeId: string, autoStartUnlocked?: boolean, lang?: Lang, onboardingDone?: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  currentLevel: 1,
  wipeId: 'default',
  autoStartUnlocked: true,
  lang: 'ja',
  onboardingDone: true, // 既存ユーザー(undefined)はtrue扱い
  setLevel: (level) => set({ currentLevel: Math.max(1, Math.min(79, level)) }),
  setWipeId: (wipeId) => set({ wipeId }),
  setAutoStart: (enabled) => set({ autoStartUnlocked: enabled }),
  setLang: (lang) => set({ lang }),
  setOnboardingDone: (done) => set({ onboardingDone: done }),
  hydrate: (level, wipeId, autoStartUnlocked, lang, onboardingDone) =>
    set({
      currentLevel: level,
      wipeId: wipeId || 'default',
      autoStartUnlocked: autoStartUnlocked ?? true,
      lang: lang ?? 'ja',
      onboardingDone: onboardingDone ?? true,
    }),
}));
