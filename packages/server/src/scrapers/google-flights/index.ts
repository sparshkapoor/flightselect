import { env } from '../../config/env';
import type { IATACode } from '@flightselect/shared';
import type { ScrapedFlight } from '../scraper.interface';
import { CabinClass } from '@flightselect/shared';
import type { IScraper } from '../scraper.interface';

interface SerpApiFlightSegment {
  departure_airport: { id: string; name: string; time: string };
  arrival_airport: { id: string; name: string; time: string };
  duration: number;
  airline: string;
  flight_number: string;
  layovers?: {
    id: string;
    duration: number;
  }[];
}

interface SerpApiFlightResult {
  price: number;
  flights: SerpApiFlightSegment[];
}

function mapCabinClass(cabin: CabinClass): string {
  switch (cabin) {
    case CabinClass.ECONOMY:
      return 'economy';
    case CabinClass.PREMIUM_ECONOMY:
      return 'premium_economy';
    case CabinClass.BUSINESS:
      return 'business';
    case CabinClass.FIRST:
      return 'first';
    default:
      return 'economy';
  }
}

function normalizeFlight(
  result: SerpApiFlightResult,
  passengers: number,
  cabinClass: CabinClass
): ScrapedFlight {
  const firstSegment = result.flights[0];
  const lastSegment = result.flights[result.flights.length - 1];

  const totalDuration = result.flights.reduce((sum, f) => sum + f.duration, 0);
  const hasLayover = result.flights.length > 1;

  const layover = hasLayover
    ? {
        airport: result.flights[0].layovers?.[0]?.id ?? null,
        duration: result.flights[0].layovers?.[0]?.duration ?? null,
      }
    : null;

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
    layoverAirport: layover?.airport ? (layover.airport as IATACode) : null,
    layoverDurationMinutes: layover?.duration ?? null,
    source: 'google-flights',
    scrapedAt: new Date(),
  };
}

export const googleFlightsScraper: IScraper = {
  source: 'google-flights',
  isAvailable() {
    return Boolean((env as any).SERPAPI_API_KEY);
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

    const baseParams: Record<string, any> = {
      engine: 'google_flights',
      api_key: (env as any).SERPAPI_API_KEY,
      departure_id: originAirport,
      arrival_id: destinationAirport,
      outbound_date: departureDate,
      currency: 'USD',
      hl: 'en',
      adults: passengers,
      travel_class: mapCabinClass(cabinClass),
    };

    if (returnDate) {
      baseParams.return_date = returnDate;
    }

    const query = new URLSearchParams(baseParams).toString();

    const response = await fetch(
      `https://serpapi.com/search.json?${query}`
    );
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.statusText}`);
    }
    
    const data = (await response.json()) as any;
    console.log(JSON.stringify(data, null, 2));

    const flights: ScrapedFlight[] = [];

    const processResults = (results?: SerpApiFlightResult[]) => {
      if (!results) return;
      for (const result of results) {
        flights.push(normalizeFlight(result, passengers, cabinClass));
      }
    };

    processResults(data.best_flights);
    processResults(data.other_flights);

    return flights;
  },
};