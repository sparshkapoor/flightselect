import { CabinClass, TripType, RecommendedOption } from './enums';

/** Branded IATA airport code type */
export type IATACode = string & { readonly __brand: 'IATACode' };

export function toIATACode(code: string): IATACode {
  if (!/^[A-Za-z]{3}$/.test(code)) {
    throw new Error(`Invalid IATA code: "${code}". Must be exactly 3 letters.`);
  }
  return code.toUpperCase() as IATACode;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: IATACode;
  arrivalAirport: IATACode;
  departureTime: string; // ISO date string
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  currency: string;
  cabinClass: CabinClass;
  isLayover: boolean;
  layoverAirport: IATACode | null;
  layoverDurationMinutes: number | null;
  source: string;
  scrapedAt: string;
  bookingUrl: string | null;
  rawData?: Record<string, unknown> | null;
  searchQueryId: string;
  /** Multi-city only: which leg this flight belongs to. */
  searchLegId?: string | null;
}

export type SearchStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

/** One leg of a multi-city trip — always one-way (no separate return on a leg itself). */
export interface SearchLeg {
  id: string;
  searchQueryId: string;
  legIndex: number;
  originAirport: IATACode;
  destinationAirport: IATACode;
  departureDate: string;
}

export interface SearchQuery {
  id: string;
  originAirport: IATACode;
  destinationAirport: IATACode;
  departureDate: string;
  returnDate: string | null;
  tripType: TripType;
  passengers: number;
  cabinClass: CabinClass;
  maxLayovers: number | null;
  maxTotalDurationMinutes: number | null;
  preferredLayoverAirports: IATACode[] | null;
  avoidedAirlines: string[] | null;
  preferredAirlines: string[] | null;
  flexibleDates: boolean;
  flexibleDateRangeDays: number | null;
  status: SearchStatus;
  createdAt: string;
  userId: string | null;
  /** Multi-city only — originAirport/destinationAirport/departureDate above are
   *  the envelope (first leg's origin, last leg's destination, first leg's date);
   *  these are the authoritative per-leg routes. */
  legs?: SearchLeg[];
}

export interface Comparison {
  id: string;
  searchQueryId: string;
  roundTripFlightIds: string[];
  oneWayOutboundFlightIds: string[];
  oneWayReturnFlightIds: string[];
  roundTripTotalPrice: number | null;
  oneWayTotalPrice: number | null;
  priceDifference: number | null;
  recommendedOption: RecommendedOption;
  aiAnalysis: string | null;
  aiAnalysisGeneratedAt: string | null;
  createdAt: string;
  /** Multi-city only: one flight ID per leg, ordered by legIndex. */
  legFlightIds: string[];
  /** Multi-city only: sum of the cheapest flight on each leg. */
  multiCityTotalPrice: number | null;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  preferredCurrency: string;
  homeAirport: IATACode | null;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  searchQueryId: string;
  nickname: string | null;
  priceAlertEnabled: boolean;
  priceAlertThreshold: number | null;
  createdAt: string;
}

// API Request/Response types
export interface SearchRequest {
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  passengers?: number;
  cabinClass?: CabinClass;
  maxLayovers?: number;
  maxTotalDurationMinutes?: number;
  preferredLayoverAirports?: string[];
  avoidedAirlines?: string[];
  preferredAirlines?: string[];
  flexibleDates?: boolean;
  flexibleDateRangeDays?: number;
  userId?: string;
  /** Required when tripType === MULTI_CITY, 2-6 entries. originAirport/destinationAirport/
   *  departureDate above should be set to the envelope (legs[0].origin, legs[N-1].destination,
   *  legs[0].departureDate) for backward-compat with code that reads those fields directly. */
  legs?: { originAirport: string; destinationAirport: string; departureDate: string }[];
}

export interface SearchResponse {
  searchQueryId: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
}

export interface FlightListResponse {
  flights: Flight[];
  total: number;
}

export interface ComparisonResponse {
  comparison: Comparison;
  roundTripFlights: Flight[];
  oneWayOutboundFlights: Flight[];
  oneWayReturnFlights: Flight[];
  /** Multi-city only — one chosen flight per leg, ordered by legIndex. */
  legFlights: Flight[];
}


export interface BookingOption {
  seller: string;
  price: number;
  currency: string;
  url: string;
  baggage?: string;
}
