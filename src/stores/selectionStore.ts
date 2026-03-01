import { create } from 'zustand';

interface SelectionState {
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
}));
