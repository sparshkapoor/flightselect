import { env } from '../../config/env';
import type { IATACode } from '@flightselect/shared';
import type { ScrapedFlight } from '../scraper.interface';
import { CabinClass } from '@flightselect/shared';
import type { IScraper } from '../scraper.interface';
import { logger } from '../../utils/logger';

interface SerpApiFlightSegment {
  departure_airport: { id: string; name: string; time: string };
  arrival_airport: { id: string; name: string; time: string };
  duration: number;
  airline: string;
  airline_logo?: string;
  flight_number: string;
  travel_class?: string;
  legroom?: string;
  extensions?: string[];
  overnight?: boolean;
  often_delayed_by_over_30_min?: boolean;
  layovers?: {
    id: string;
    name?: string;
    duration: number;
    overnight?: boolean;
  }[];
}

interface SerpApiFlightResult {
  price: number;
  type?: string;
  flights: SerpApiFlightSegment[];
  total_duration?: number;
  carbon_emissions?: {
    this_flight: number;
    typical_for_this_route: number;
    difference_percent: number;
  };
  airline_logo?: string;
  extensions?: string[];
  departure_token?: string;
  booking_token?: string;
}

const CABIN_CLASS_MAP: Record<CabinClass, number> = {
  [CabinClass.ECONOMY]: 1,
  [CabinClass.PREMIUM_ECONOMY]: 2,
  [CabinClass.BUSINESS]: 3,
  [CabinClass.FIRST]: 4,
};

function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date.split('T')[0];
  return date.toISOString().split('T')[0];
}

function buildGoogleFlightsUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): string {
  const base = `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${destination}+on+${departureDate}`;
  if (returnDate) {
    return `${base}+return+${returnDate}`;
  }
  return base;
}

function normalizeFlight(
  result: SerpApiFlightResult,
  passengers: number,
  cabinClass: CabinClass,
  departureDate: string,
  returnDate?: string,
): ScrapedFlight {
  const firstSegment = result.flights[0];
  const lastSegment = result.flights[result.flights.length - 1];

  const totalDuration = result.total_duration
    ?? result.flights.reduce((sum, f) => sum + f.duration, 0);
  const hasLayover = result.flights.length > 1;

  // Layover info: SerpAPI puts it on each segment's `layovers` array,
  // but it's not always present. Fall back to the arrival airport of the
  // first segment (which is the connecting airport).
  let layoverAirport: string | null = null;
  let layoverDuration: number | null = null;

  if (hasLayover) {
    // Try the explicit layovers array first
    const explicitLayover = result.flights[0].layovers?.[0];
    if (explicitLayover) {
      layoverAirport = explicitLayover.id ?? null;
      layoverDuration = explicitLayover.duration ?? null;
    } else {
      // Fallback: the arrival airport of the first segment is the layover point
      layoverAirport = firstSegment.arrival_airport?.id ?? null;
      // Estimate layover duration: gap between first segment arrival and second segment departure
      if (result.flights.length >= 2) {
        const seg1Arrival = new Date(firstSegment.arrival_airport.time);
        const seg2Departure = new Date(result.flights[1].departure_airport.time);
        const gap = Math.round((seg2Departure.getTime() - seg1Arrival.getTime()) / 60000);
        if (gap > 0) layoverDuration = gap;
      }
    }
  }

  return {
    airline: firstSegment.airline,
    flightNumber: firstSegment.flight_number,
    departureAirport: firstSegment.departure_airport.id as IATACode,
    arrivalAirport: lastSegment.arrival_airport.id as IATACode,
    departureTime: new Date(firstSegment.departure_airport.time),
    arrivalTime: new Date(lastSegment.arrival_airport.time),
    durationMinutes: totalDuration,
    price: result.price * passengers,
    currency: 'USD',
    cabinClass,
    isLayover: hasLayover,
    layoverAirport: layoverAirport ? (layoverAirport as IATACode) : null,
    layoverDurationMinutes: layoverDuration,
    source: 'google-flights',
    scrapedAt: new Date(),
    bookingUrl: buildGoogleFlightsUrl(
      firstSegment.departure_airport.id,
      lastSegment.arrival_airport.id,
      departureDate,
      returnDate,
    ),
    rawData: {
      bookingToken: result.booking_token ?? null,
      departureToken: result.departure_token ?? null,
      carbonEmissions: result.carbon_emissions ?? null,
      airlineLogo: firstSegment.airline_logo ?? result.airline_logo ?? null,
      extensions: result.extensions ?? null,
    },
  };
}

async function fetchOneWay(
  origin: string,
  destination: string,
  date: string,
  passengers: number,
  cabinClass: CabinClass,
  returnDateForUrl?: string,
): Promise<ScrapedFlight[]> {
  const searchParams: Record<string, string> = {
    engine: 'google_flights',
    api_key: env.SERPAPI_API_KEY!,
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    type: '2', // one-way
    currency: 'USD',
    hl: 'en',
    adults: String(passengers),
    travel_class: String(CABIN_CLASS_MAP[cabinClass] ?? 1),
  };

  const query = new URLSearchParams(searchParams).toString();
  logger.info(`SerpAPI request: ${origin} → ${destination}, date=${date}, type=one-way`);

  const response = await fetch(`https://serpapi.com/search.json?${query}`);

  if (!response.ok) {
    const body = await response.text();
    logger.error(`SerpAPI error ${response.status}: ${body}`);
    throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  if (data.error) {
    logger.error(`SerpAPI returned error: ${data.error}`);
    throw new Error(`SerpAPI: ${data.error}`);
  }

  logger.info(`SerpAPI returned ${data.best_flights?.length ?? 0} best + ${data.other_flights?.length ?? 0} other flights for ${origin}→${destination}`);

  const flights: ScrapedFlight[] = [];

  const processResults = (results?: SerpApiFlightResult[]) => {
    if (!results) return;
    for (const result of results) {
      // Skip flights with missing or invalid prices
      if (!result.price || isNaN(result.price)) {
        logger.warn(`Skipping flight with invalid price: ${result.flights?.[0]?.flight_number}`);
        continue;
      }
      flights.push(normalizeFlight(result, passengers, cabinClass, date, returnDateForUrl));
    }
  };

  processResults(data.best_flights);
  processResults(data.other_flights);

  return flights;
}

export const googleFlightsScraper: IScraper = {
  source: 'google-flights',
  isAvailable() {
    return Boolean(env.SERPAPI_API_KEY);
  },

  async search(params) {
    const {
      originAirport,
      destinationAirport,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
    } = params;

    const outboundDate = formatDate(departureDate);
    const returnDateStr = returnDate ? formatDate(returnDate) : undefined;

    // Always search as one-way. For round trips, we make two separate
    // one-way calls (outbound + return) so we get flights for both legs.
    // SerpAPI's round-trip mode requires a departure_token flow which
    // costs extra API calls and only returns return flights for one
    // selected outbound — not useful for our comparison engine.
    const outboundFlights = await fetchOneWay(
      originAirport, destinationAirport, outboundDate,
      passengers, cabinClass, returnDateStr,
    );

    if (!returnDateStr) {
      return outboundFlights;
    }

    // Fetch return leg
    const returnFlights = await fetchOneWay(
      destinationAirport, originAirport, returnDateStr,
      passengers, cabinClass,
    );

    logger.info(`SerpAPI total: ${outboundFlights.length} outbound + ${returnFlights.length} return flights`);
    return [...outboundFlights, ...returnFlights];
  },
};
