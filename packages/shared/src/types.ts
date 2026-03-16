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
}

export type SearchStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

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
}

export interface Comparison {
  id: string;
  searchQueryId: string;
  roundTripFlightIds: string[];
  oneWayOutboundFlightIds: string[];
  oneWayReturnFlightIds: string[];
  roundTripTotalPrice: number;
  oneWayTotalPrice: number;
  priceDifference: number;
  recommendedOption: RecommendedOption;
  aiAnalysis: string | null;
  aiAnalysisGeneratedAt: string | null;
  createdAt: string;
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
}

export interface AIAnalysisRequest {
  comparisonId: string;
  searchQuery: SearchQuery;
  comparison: Comparison;
  flights: Flight[];
}

export interface AIAnalysisResponse {
  summary: string;
  recommendation: RecommendedOption;
  confidenceScore: number;
  reasoning: string[];
  warnings: string[];
  generatedAt: string;
}
