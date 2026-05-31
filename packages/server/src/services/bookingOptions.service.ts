import { queryOne } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { BookingOption } from '@flightselect/shared';
import { DbFlight } from '../types/db';

interface SerpApiBookingOption {
  book_with?: string;
  price?: number;
  currency?: string;
  together_price?: number;
  baggage?: string;
  extensions?: string[];
  options?: { url: string }[];
}

interface SerpApiBookingResponse {
  search_metadata?: { google_flights_url?: string };
  booking_options?: SerpApiBookingOption[];
  error?: string;
}

export async function getBookingOptions(
  flightId: string
): Promise<{ options: BookingOption[]; googleFlightsUrl?: string; message?: string }> {
  const flight = await queryOne<DbFlight>('SELECT * FROM "Flight" WHERE id = $1', [flightId]);
  if (!flight) return { options: [], message: 'Flight not found' };

  const bookingToken = flight.rawData?.bookingToken as string | null | undefined;

  if (!bookingToken) {
    return { options: [], message: 'No booking token available for this flight' };
  }

  if (!env.SERPAPI_API_KEY) {
    return { options: [], message: 'SerpAPI not configured' };
  }

  // Look up the search query for trip type and return date — SerpAPI requires
  // departure_id/arrival_id/outbound_date (and return_date for round trips) alongside booking_token.
  const outboundDate = new Date(flight.departureTime).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    engine: 'google_flights',
    booking_token: bookingToken,
    departure_id: flight.departureAirport,
    arrival_id: flight.arrivalAirport,
    outbound_date: outboundDate,
    type: '2', // always one-way — booking tokens were captured from one-way searches
    currency: 'USD',
    hl: 'en',
    gl: 'us',
    api_key: env.SERPAPI_API_KEY,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, 'SerpAPI booking options request failed');
    return { options: [], message: 'Booking options unavailable' };
  }

  const data = (await res.json()) as SerpApiBookingResponse;

  const googleFlightsUrl = data.search_metadata?.google_flights_url ?? undefined;

  const raw = data.booking_options ?? [];
  const options: BookingOption[] = raw
    .filter((o) => o.options?.[0]?.url)
    .map((o) => ({
      seller: o.book_with ?? 'Unknown',
      price: o.price ?? o.together_price ?? 0,
      currency: o.currency ?? 'USD',
      url: o.options![0].url,
      baggage: o.baggage,
    }));

  logger.info(
    { flightId, googleFlightsUrl, optionCount: options.length },
    'Booking options fetched'
  );

  return { options, googleFlightsUrl };
}
