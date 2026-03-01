import { create } from 'zustand';

interface NowPinsState {
  taskIds: string[];
  hydrate: (taskIds: string[]) => void;
  /** 楽観的追加 — 呼び出し元がDexieへの永続化も行う必要あり */
  addPin: (taskId: string) => void;
  /** 楽観的削除 — 呼び出し元がDexieへの永続化も行う必要あり */
  removePin: (taskId: string) => void;
}

export const useNowPinsStore = create<NowPinsState>((set, get) => ({
  taskIds: [],
  hydrate: (taskIds) => set({ taskIds }),
  addPin: (taskId) => {
    const current = get().taskIds;
    if (current.length >= 10 || current.includes(taskId)) return;
    set({ taskIds: [...current, taskId] });
  },
  removePin: (taskId) => {
    set({ taskIds: get().taskIds.filter((id) => id !== taskId) });
  },
}));
