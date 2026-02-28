import { create } from 'zustand';

interface FilterState {
  maxPrice: number | undefined;
  minPrice: number | undefined;
  maxDurationMinutes: number | undefined;
  maxLayovers: number | undefined;
  maxLayoverDurationMinutes: number | undefined;
  selectedAirlines: string[];
  departureTimeStart: string | undefined;
  departureTimeEnd: string | undefined;

  setMaxPrice: (v: number | undefined) => void;
  setMinPrice: (v: number | undefined) => void;
  setMaxDurationMinutes: (v: number | undefined) => void;
  setMaxLayovers: (v: number | undefined) => void;
  setMaxLayoverDurationMinutes: (v: number | undefined) => void;
  setSelectedAirlines: (v: string[]) => void;
  setDepartureTimeStart: (v: string | undefined) => void;
  setDepartureTimeEnd: (v: string | undefined) => void;
  reset: () => void;
}

const initialFilterState = {
  maxPrice: undefined as number | undefined,
  minPrice: undefined as number | undefined,
  maxDurationMinutes: undefined as number | undefined,
  maxLayovers: undefined as number | undefined,
  maxLayoverDurationMinutes: undefined as number | undefined,
  selectedAirlines: [] as string[],
  departureTimeStart: undefined as string | undefined,
  departureTimeEnd: undefined as string | undefined,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialFilterState,
  setMaxPrice: (v) => set({ maxPrice: v }),
  setMinPrice: (v) => set({ minPrice: v }),
  setMaxDurationMinutes: (v) => set({ maxDurationMinutes: v }),
  setMaxLayovers: (v) => set({ maxLayovers: v }),
  setMaxLayoverDurationMinutes: (v) => set({ maxLayoverDurationMinutes: v }),
  setSelectedAirlines: (v) => set({ selectedAirlines: v }),
  setDepartureTimeStart: (v) => set({ departureTimeStart: v }),
  setDepartureTimeEnd: (v) => set({ departureTimeEnd: v }),
  reset: () => set(initialFilterState),
}));
