import { useProfileStore } from '../stores/profileStore';
import ja from './ja';
import en from './en';
import type { Lang, Dictionary } from './types';

export type { Lang, Dictionary };

const dicts: Record<Lang, Dictionary> = { ja, en };

/** UIテキスト辞書を取得するフック */
export function useT(): Dictionary {
  const lang = useProfileStore((s) => s.lang);
  return dicts[lang];
}

/** 現在の言語を取得するフック（APIクエリキー用） */
export function useLang(): Lang {
  return useProfileStore((s) => s.lang);
}

/** コンポーネント外から現在の言語を取得 */
export function getLang(): Lang {
  return useProfileStore.getState().lang;
}
