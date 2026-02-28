import { create } from 'zustand';
import { CabinClass, TripType } from '@flightselect/shared';
import type { Flight, Comparison } from '@flightselect/shared';

interface SearchState {
  // Form state
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
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

const initialState = {
  originAirport: '',
  destinationAirport: '',
  departureDate: '',
  returnDate: '',
  tripType: TripType.ROUND_TRIP,
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

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,
  setOriginAirport: (v) => set({ originAirport: v }),
  setDestinationAirport: (v) => set({ destinationAirport: v }),
  setDepartureDate: (v) => set({ departureDate: v }),
  setReturnDate: (v) => set({ returnDate: v }),
  setTripType: (v) => set({ tripType: v }),
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
