import { create } from 'zustand';
import type { PriceTier } from '../api/types';

type SortBy = 'pricePerSlot' | 'bestSellPrice' | 'name';
type SortDir = 'asc' | 'desc';
type ViewMode = 'tier' | 'grid';
export type TaskRelation = 'usedInKappaTask' | 'rewardFromTask' | 'collector';

interface ItemFilterState {
  search: string;
  types: string[];
  tiers: PriceTier[];
  taskRelations: TaskRelation[];
  sortBy: SortBy;
  sortDir: SortDir;
  viewMode: ViewMode;
  setSearch: (search: string) => void;
  setTypes: (types: string[]) => void;
  setTiers: (tiers: PriceTier[]) => void;
  setTaskRelations: (taskRelations: TaskRelation[]) => void;
  setSortBy: (sortBy: SortBy) => void;
  toggleSortDir: () => void;
  setViewMode: (viewMode: ViewMode) => void;
  resetFilters: () => void;
}

const initialFilters = {
  search: '',
  types: [] as string[],
  tiers: [] as PriceTier[],
  taskRelations: [] as TaskRelation[],
  sortBy: 'pricePerSlot' as SortBy,
  sortDir: 'desc' as SortDir,
  viewMode: 'tier' as ViewMode,
};

export const useItemFilterStore = create<ItemFilterState>((set) => ({
  ...initialFilters,
  setSearch: (search) => set({ search }),
  setTypes: (types) => set({ types }),
  setTiers: (tiers) => set({ tiers }),
  setTaskRelations: (taskRelations) => set({ taskRelations }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortDir: () => set((s) => ({ sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' })),
  setViewMode: (viewMode) => set({ viewMode }),
  resetFilters: () => set(initialFilters),
}));
