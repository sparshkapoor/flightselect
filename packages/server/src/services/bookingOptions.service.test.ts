import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DbFlight } from '../types/db';

const queryOneMock = vi.fn();
const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();

vi.mock('../config/database', () => ({
  queryOne: (...args: unknown[]) => queryOneMock(...args),
}));

vi.mock('../config/env', () => ({
  env: { SERPAPI_API_KEY: 'test-key' },
}));

vi.mock('./cache.service', () => ({
  cacheService: {
    get: (...args: unknown[]) => cacheGetMock(...args),
    set: (...args: unknown[]) => cacheSetMock(...args),
  },
}));

import { getBookingOptions } from './bookingOptions.service';

function makeFlight(overrides: Partial<DbFlight> = {}): DbFlight {
  return {
    id: 'f1',
    departureAirport: 'JFK',
    arrivalAirport: 'LAX',
    departureTime: new Date('2026-07-10T08:00:00Z'),
    rawData: { bookingToken: 'token123' },
    ...overrides,
  } as DbFlight;
}

describe('getBookingOptions', () => {
  beforeEach(() => {
    queryOneMock.mockReset();
    cacheGetMock.mockReset().mockResolvedValue(null);
    cacheSetMock.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('surfaces a SerpAPI-side error as a definitive message instead of a silent empty result, and does not cache it', async () => {
    queryOneMock.mockResolvedValue(makeFlight());
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'Invalid booking_token.' }),
    } as Response);

    const result = await getBookingOptions('f1');

    expect(result.options).toEqual([]);
    expect(result.message).toBe('Booking lookup failed: Invalid booking_token.');
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it('returns a genuinely empty result with no message when SerpAPI succeeds with zero sellers, and caches it', async () => {
    queryOneMock.mockResolvedValue(makeFlight());
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ booking_options: [] }),
    } as Response);

    const result = await getBookingOptions('f1');

    expect(result.options).toEqual([]);
    expect(result.message).toBeUndefined();
    expect(cacheSetMock).toHaveBeenCalledWith('booking-options:f1', result, 15 * 60);
  });

  it('serves a cached result without calling SerpAPI again', async () => {
    queryOneMock.mockResolvedValue(makeFlight());
    cacheGetMock.mockResolvedValue({ options: [], googleFlightsUrl: 'https://cached.example' });

    const result = await getBookingOptions('f1');

    expect(result.googleFlightsUrl).toBe('https://cached.example');
    expect(fetch).not.toHaveBeenCalled();
  });
});
