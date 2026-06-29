import { useQuery } from '@tanstack/react-query';
import type { BookingOption } from '@flightselect/shared';

export interface BookingOptionsResult {
  options: BookingOption[];
  message?: string;
}

async function fetchBatch(flightIds: string[]): Promise<Record<string, BookingOptionsResult>> {
  const res = await fetch('/api/flights/booking-options/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Failed to load booking options');
  return data.data;
}

/**
 * Fetches booking options for several flights at once — the comparison view
 * shows up to 4 flights simultaneously (round-trip bundle + mix & match), and
 * fetching each individually would burn through the per-client rate limit
 * meant for one-at-a-time "view options" clicks. One request, one token.
 */
export function useBatchBookingOptions(flightIds: string[]) {
  const key = [...new Set(flightIds)].sort().join(',');
  return useQuery({
    queryKey: ['batchBookingOptions', key],
    queryFn: () => fetchBatch([...new Set(flightIds)]),
    enabled: flightIds.length > 0,
  });
}
