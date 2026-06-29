export interface DbUser {
  id: string;
  email: string;
  displayName: string | null;
  preferredCurrency: string;
  homeAirport: string | null;
  createdAt: Date;
}

export interface DbSearchQuery {
  id: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: Date;
  returnDate: Date | null;
  tripType: string;
  passengers: number;
  cabinClass: string;
  maxLayovers: number | null;
  maxTotalDurationMinutes: number | null;
  preferredLayoverAirports: string[];
  avoidedAirlines: string[];
  preferredAirlines: string[];
  flexibleDates: boolean;
  flexibleDateRangeDays: number | null;
  status: string;
  createdAt: Date;
  userId: string | null;
}

export interface DbFlight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: Date;
  arrivalTime: Date;
  durationMinutes: number;
  price: string; // DECIMAL comes back as string from pg
  currency: string;
  cabinClass: string;
  isLayover: boolean;
  layoverAirport: string | null;
  layoverDurationMinutes: number | null;
  source: string;
  scrapedAt: Date;
  bookingUrl: string | null;
  rawData: Record<string, unknown> | null;
  searchQueryId: string;
}

export interface DbComparison {
  id: string;
  searchQueryId: string;
  roundTripFlightIds: string[];
  oneWayOutboundFlightIds: string[];
  oneWayReturnFlightIds: string[];
  roundTripTotalPrice: string | null; // DECIMAL — null when no round-trip option exists
  oneWayTotalPrice: string;    // DECIMAL
  priceDifference: string | null;     // DECIMAL — null when no round-trip option exists
  recommendedOption: string;
  aiAnalysis: string | null;
  aiAnalysisGeneratedAt: Date | null;
  createdAt: Date;
}
