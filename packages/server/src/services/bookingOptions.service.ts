import { queryOne } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { cacheService } from './cache.service';
import { mapWithConcurrency } from '../utils/concurrency';
import type { BookingOption } from '@flightselect/shared';
import { DbFlight } from '../types/db';

// Booking-options pricing/sellers are more volatile than flight search
// results — a short TTL trades a little staleness for real SerpAPI quota
// savings (free tier: 100 searches/month) when the same already-scraped
// flight is viewed again (repeat clicks, multiple users, batch eager-load).
const BOOKING_OPTIONS_CACHE_TTL = 15 * 60;

// This is a synchronous, user-facing wait (the comparison view blocks on it),
// not a background job — 30s per flight was tolerable for a single lookup but
// compounds badly across a batch. 12s still gives SerpAPI room to respond
// without leaving the user staring at a spinner for half a minute.
const BOOKING_OPTIONS_TIMEOUT_MS = 12_000;

// Caps how many SerpAPI booking-option requests run at once for a single
// batch. A comparison view requests up to 4 flights at once — running them
// in parallel (instead of one at a time) cuts wall time roughly 4x, while
// staying well under SerpAPI's concurrent-request tolerance.
const BOOKING_OPTIONS_BATCH_CONCURRENCY = 4;

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

// Looks up booking options for several flights under a single rate-limit
// token. A comparison view shows up to 4 flights at once (the round-trip
// bundle's 2 legs + the mix-and-match pair) — fetching each individually
// would mean 4 client requests from the same IP within the same instant,
// which the per-client rate limiter (1 request per window) was never meant
// to throttle; that limiter exists to pace deliberate, one-at-a-time
// "view options" clicks, not a single page load showing several flights.
// getBookingOptions calls still make one real SerpAPI call per flight (the
// metered cost is unchanged) — only the per-client throttle is collapsed to
// one token for the whole batch. Fetched with bounded concurrency rather than
// sequentially so a 4-flight batch takes roughly one request's wall time
// instead of four.
export async function getBookingOptionsBatch(
  flightIds: string[]
): Promise<Record<string, { options: BookingOption[]; googleFlightsUrl?: string; message?: string }>> {
  const entries = await mapWithConcurrency(
    flightIds,
    BOOKING_OPTIONS_BATCH_CONCURRENCY,
    async (id) => [id, await getBookingOptions(id)] as const
  );
  return Object.fromEntries(entries);
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

  const cacheKey = `booking-options:${flightId}`;
  const cached = await cacheService.get<{ options: BookingOption[]; googleFlightsUrl?: string }>(cacheKey);
  if (cached) {
    return cached;
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
    signal: AbortSignal.timeout(BOOKING_OPTIONS_TIMEOUT_MS),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, 'SerpAPI booking options request failed');
    return { options: [], message: 'Booking options unavailable' };
  }

  const data = (await res.json()) as SerpApiBookingResponse;

  if (data.error) {
    logger.warn({ flightId, serpApiError: data.error }, 'SerpAPI returned an error for booking options');
    return { options: [], message: `Booking lookup failed: ${data.error}` };
  }

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

  const result = { options, googleFlightsUrl };
  // Only cache a genuine SerpAPI result (populated or genuinely empty) — never
  // cache the error/message branches above, so a transient SerpAPI error or
  // quota blip doesn't get frozen into a false "unavailable" for 15 minutes.
  await cacheService.set(cacheKey, result, BOOKING_OPTIONS_CACHE_TTL);
  return result;
}
