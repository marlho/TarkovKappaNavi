import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TierThresholds {
  S: number;
  A: number;
  B: number;
  C: number;
}

export const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  S: 100_000,
  A: 50_000,
  B: 20_000,
  C: 10_000,
};

interface TierState {
  thresholds: TierThresholds;
  setThresholds: (thresholds: TierThresholds) => void;
  resetThresholds: () => void;
}

export const useTierStore = create<TierState>()(
  persist(
    (set) => ({
      thresholds: { ...DEFAULT_TIER_THRESHOLDS },
      setThresholds: (thresholds) => set({ thresholds }),
      resetThresholds: () => set({ thresholds: { ...DEFAULT_TIER_THRESHOLDS } }),
    }),
    {
      name: 'tarkov-kappa-tier-thresholds',
    },
  ),
);

/** カスタム閾値を取得するフック */
export function useTierThresholds(): TierThresholds {
  return useTierStore((s) => s.thresholds);
}
