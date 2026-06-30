import { create } from 'zustand';
import { CabinClass, TripType } from '@flightselect/shared';
import type { Flight, Comparison } from '@flightselect/shared';

export interface SearchLegDraft {
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
}

const MAX_MULTI_CITY_LEGS = 6;

interface SearchState {
  // Form state
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
  /** Multi-city only. */
  legs: SearchLegDraft[];
  passengers: number;
  cabinClass: CabinClass;
  maxLayovers: number | undefined;
  flexibleDates: boolean;
  flexibleDateRangeDays: number | undefined;
  preferredAirlines: string[];
  avoidedAirlines: string[];
  compareMode: boolean;

  // Results state
  searchQueryId: string | null;
  flights: Flight[];
  comparison: Comparison | null;
  isSearching: boolean;
  searchError: string | null;

  // Actions
  setOriginAirport: (v: string) => void;
  setDestinationAirport: (v: string) => void;
  setDepartureDate: (v: string) => void;
  setReturnDate: (v: string) => void;
  setTripType: (v: TripType) => void;
  addLeg: () => void;
  removeLeg: (index: number) => void;
  updateLeg: (index: number, patch: Partial<SearchLegDraft>) => void;
  setPassengers: (v: number) => void;
  setCabinClass: (v: CabinClass) => void;
  setMaxLayovers: (v: number | undefined) => void;
  setFlexibleDates: (v: boolean) => void;
  setFlexibleDateRangeDays: (v: number | undefined) => void;
  setPreferredAirlines: (v: string[]) => void;
  setAvoidedAirlines: (v: string[]) => void;
  setCompareMode: (v: boolean) => void;
  setSearchQueryId: (v: string | null) => void;
  setFlights: (v: Flight[]) => void;
  setComparison: (v: Comparison | null) => void;
  setIsSearching: (v: boolean) => void;
  setSearchError: (v: string | null) => void;
  reset: () => void;
}

const emptyLeg = (): SearchLegDraft => ({ originAirport: '', destinationAirport: '', departureDate: '' });

const initialState = {
  originAirport: '',
  destinationAirport: '',
  departureDate: '',
  returnDate: '',
  tripType: TripType.ROUND_TRIP,
  legs: [] as SearchLegDraft[],
  passengers: 1,
  cabinClass: CabinClass.ECONOMY,
  maxLayovers: undefined as number | undefined,
  flexibleDates: false,
  flexibleDateRangeDays: undefined as number | undefined,
  preferredAirlines: [] as string[],
  avoidedAirlines: [] as string[],
  compareMode: true,
  searchQueryId: null as string | null,
  flights: [] as Flight[],
  comparison: null as Comparison | null,
  isSearching: false,
  searchError: null as string | null,
};

export const useSearchStore = create<SearchState>((set, get) => ({
  ...initialState,
  setOriginAirport: (v) => set({ originAirport: v }),
  setDestinationAirport: (v) => set({ destinationAirport: v }),
  setDepartureDate: (v) => set({ departureDate: v }),
  setReturnDate: (v) => set({ returnDate: v }),
  setTripType: (v) =>
    set({
      tripType: v,
      // Seed two blank legs the first time multi-city is selected.
      legs: v === TripType.MULTI_CITY && get().legs.length === 0 ? [emptyLeg(), emptyLeg()] : get().legs,
    }),
  addLeg: () =>
    set((state) => (state.legs.length >= MAX_MULTI_CITY_LEGS ? state : { legs: [...state.legs, emptyLeg()] })),
  removeLeg: (index) =>
    set((state) => ({ legs: state.legs.length <= 2 ? state.legs : state.legs.filter((_, i) => i !== index) })),
  updateLeg: (index, patch) =>
    set((state) => ({
      legs: state.legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)),
    })),
  setPassengers: (v) => set({ passengers: v }),
  setCabinClass: (v) => set({ cabinClass: v }),
  setMaxLayovers: (v) => set({ maxLayovers: v }),
  setFlexibleDates: (v) => set({ flexibleDates: v }),
  setFlexibleDateRangeDays: (v) => set({ flexibleDateRangeDays: v }),
  setPreferredAirlines: (v) => set({ preferredAirlines: v }),
  setAvoidedAirlines: (v) => set({ avoidedAirlines: v }),
  setCompareMode: (v) => set({ compareMode: v }),
  setSearchQueryId: (v) => set({ searchQueryId: v }),
  setFlights: (v) => set({ flights: v }),
  setComparison: (v) => set({ comparison: v }),
  setIsSearching: (v) => set({ isSearching: v }),
  setSearchError: (v) => set({ searchError: v }),
  reset: () => set(initialState),
}));
