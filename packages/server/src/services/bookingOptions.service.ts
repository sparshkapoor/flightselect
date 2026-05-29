import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { BookingOption } from '@flightselect/shared';

interface SerpApiBookingOption {
  book_with?: string;
  price?: number;
  currency?: string;
  together_price?: number;
  baggage?: string;
  extensions?: string[];
  options?: { url: string }[];
}

export async function getBookingOptions(
  flightId: string
): Promise<{ options: BookingOption[]; message?: string }> {
  const flight = await prisma.flight.findUnique({ where: { id: flightId } });
  if (!flight) return { options: [], message: 'Flight not found' };

  const rawData = flight.rawData as Record<string, unknown> | null;
  const bookingToken = rawData?.bookingToken as string | null | undefined;

  if (!bookingToken) {
    return { options: [], message: 'No booking token available for this flight' };
  }

  if (!env.SERPAPI_API_KEY) {
    return { options: [], message: 'SerpAPI not configured' };
  }

  const params = new URLSearchParams({
    engine: 'google_flights',
    booking_token: bookingToken,
    api_key: env.SERPAPI_API_KEY,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, 'SerpAPI booking options request failed');
    return { options: [], message: 'Booking options unavailable' };
  }

  const data = (await res.json()) as { booking_options?: SerpApiBookingOption[] };
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

  return { options };
}
