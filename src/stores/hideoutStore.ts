import { create } from 'zustand';

interface HideoutState {
  selectedStationId: string | null;
  setSelectedStationId: (stationId: string | null) => void;
  mobileTab: 'list' | 'summary';
  setMobileTab: (tab: 'list' | 'summary') => void;
  summaryFilter: 'buildable' | 'not_built' | 'all';
  setSummaryFilter: (filter: 'buildable' | 'not_built' | 'all') => void;
  summaryCompact: boolean;
  toggleSummaryCompact: () => void;
}

export const useHideoutStore = create<HideoutState>((set) => ({
  selectedStationId: null,
  setSelectedStationId: (stationId) =>
    set({ selectedStationId: stationId }),
  mobileTab: 'list',
  setMobileTab: (tab) => set({ mobileTab: tab }),
  summaryFilter: 'buildable',
  setSummaryFilter: (filter) => set({ summaryFilter: filter }),
  summaryCompact: false,
  toggleSummaryCompact: () => set((s) => ({ summaryCompact: !s.summaryCompact })),
}));
