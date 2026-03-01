import { create } from 'zustand';
import type { TaskStatus } from '../db/types';

interface FilterState {
  traders: string[];
  maps: string[];
  types: string[];
  statuses: TaskStatus[];
  search: string;
  kappaOnly: boolean;
  setTraders: (traders: string[]) => void;
  setMaps: (maps: string[]) => void;
  setTypes: (types: string[]) => void;
  setStatuses: (statuses: TaskStatus[]) => void;
  setSearch: (search: string) => void;
  setKappaOnly: (kappaOnly: boolean) => void;
  resetFilters: () => void;
}

const initialFilters = {
  traders: [] as string[],
  maps: [] as string[],
  types: [] as string[],
  statuses: [] as TaskStatus[],
  search: '',
  kappaOnly: false,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialFilters,
  setTraders: (traders) => set({ traders }),
  setMaps: (maps) => set({ maps }),
  setTypes: (types) => set({ types }),
  setStatuses: (statuses) => set({ statuses }),
  setSearch: (search) => set({ search }),
  setKappaOnly: (kappaOnly) => set({ kappaOnly }),
  resetFilters: () => set(initialFilters),
}));
