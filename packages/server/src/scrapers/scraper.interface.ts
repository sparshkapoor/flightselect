import { CabinClass } from '@flightselect/shared';

export interface ScraperSearchParams {
  searchQueryId: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: number;
  cabinClass: CabinClass;
  maxLayovers?: number;
}

export interface ScrapedFlight {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: Date;
  arrivalTime: Date;
  durationMinutes: number;
  price: number;
  currency: string;
  cabinClass: CabinClass;
  isLayover: boolean;
  layoverAirport: string | null;
  layoverDurationMinutes: number | null;
  source: string;
  scrapedAt: Date;
  bookingUrl: string | null;
  rawData?: Record<string, unknown>;
}

/**
 * IScraper defines the interface all flight data scrapers must implement.
 * Each scraper targets a specific source (e.g., Google Flights, Skyscanner, Amadeus).
 */
export interface IScraper {
  /** Unique identifier for this scraper (e.g., 'google_flights', 'skyscanner') */
  readonly source: string;

  /**
   * Execute a search and return scraped flight data.
   * @param params - Normalized search parameters
   * @returns Array of scraped flight objects
   */
  search(params: ScraperSearchParams): Promise<ScrapedFlight[]>;

  /**
   * Check whether this scraper is currently available/configured.
   */
  isAvailable(): boolean;
}
