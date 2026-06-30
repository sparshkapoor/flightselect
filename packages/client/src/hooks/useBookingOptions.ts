import { useState, useCallback } from 'react';
import type { BookingOption } from '@flightselect/shared';

/** Click-to-fetch sellers for a single flight card (the general browsing list's pace). */
export function useBookingOptions(flightId: string) {
  const [options, setOptions] = useState<BookingOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNow = useCallback(async (): Promise<void> => {
    if (options !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flightId}/booking-options`);
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.message ?? 'Failed'), { status: res.status, data });
      const fetched: BookingOption[] = data.options ?? [];
      setOptions(fetched);
      if (data.message) {
        setError(data.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load booking options');
    } finally {
      setLoading(false);
    }
  }, [flightId, options]);

  return { options, loading, error, fetchNow };
}
