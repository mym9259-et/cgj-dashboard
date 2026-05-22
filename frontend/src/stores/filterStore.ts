import { create } from "zustand";
import type { FilterItem } from "../types/filter";

interface FilterState {
  filters: FilterItem[];
  filterLogic: "AND" | "OR";
  startDate: string | null;
  endDate: string | null;

  setFilters: (filters: FilterItem[]) => void;
  addFilter: (filter: FilterItem) => void;
  removeFilter: (index: number) => void;
  updateFilter: (index: number, filter: FilterItem) => void;
  setFilterLogic: (logic: "AND" | "OR") => void;
  setDateRange: (start: string | null, end: string | null) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: [],
  filterLogic: "AND",
  startDate: null,
  endDate: null,

  setFilters: (filters) => set({ filters }),
  addFilter: (filter) =>
    set((state) => ({ filters: [...state.filters, filter] })),
  removeFilter: (index) =>
    set((state) => ({
      filters: state.filters.filter((_, i) => i !== index),
    })),
  updateFilter: (index, filter) =>
    set((state) => ({
      filters: state.filters.map((f, i) => (i === index ? filter : f)),
    })),
  setFilterLogic: (logic) => set({ filterLogic: logic }),
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),
  clearAll: () =>
    set({ filters: [], filterLogic: "AND", startDate: null, endDate: null }),
}));
