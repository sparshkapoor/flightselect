import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DbSearchQuery } from '../types/db';

const queryMock = vi.fn();
const queryOneMock = vi.fn();

vi.mock('../config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  queryOne: (...args: unknown[]) => queryOneMock(...args),
}));

vi.mock('./comparison.job', () => ({
  processComparisonJob: vi.fn().mockResolvedValue(undefined),
}));

function makeScrapedFlight(overrides: Record<string, unknown>) {
  return {
    airline: 'United',
    flightNumber: 'UA100',
    departureAirport: 'EWR',
    arrivalAirport: 'SFO',
    departureTime: new Date('2026-07-01T08:00:00Z'),
    arrivalTime: new Date('2026-07-01T11:00:00Z'),
    durationMinutes: 360,
    price: 250,
    currency: 'USD',
    cabinClass: 'ECONOMY',
    isLayover: false,
    layoverAirport: null,
    layoverDurationMinutes: null,
    source: 'serpapi',
    scrapedAt: new Date('2026-06-26'),
    bookingUrl: null,
    rawData: null,
    ...overrides,
  };
}

const scrapedFlights = [
  makeScrapedFlight({ airline: 'United', flightNumber: 'UA100', price: 250 }),
  makeScrapedFlight({ airline: 'Spirit', flightNumber: 'NK200', price: 180 }),
  makeScrapedFlight({ airline: 'Delta', flightNumber: 'DL300', price: 300 }),
];

const searchMock = vi.fn().mockResolvedValue(scrapedFlights);

vi.mock('../scrapers/scraper.factory', () => ({
  ScraperFactory: {
    getAvailableScrapers: () => [{ search: searchMock }],
  },
}));

import { processSearchJob } from './search.job';

function makeSearchQuery(overrides: Partial<DbSearchQuery> = {}): DbSearchQuery {
  return {
    id: 'sq1',
    originAirport: 'EWR',
    destinationAirport: 'SFO',
    departureDate: new Date('2026-07-01'),
    returnDate: null,
    tripType: 'ONE_WAY',
    passengers: 1,
    cabinClass: 'ECONOMY',
    maxLayovers: null,
    maxTotalDurationMinutes: null,
    preferredLayoverAirports: [],
    avoidedAirlines: [],
    preferredAirlines: [],
    flexibleDates: false,
    flexibleDateRangeDays: null,
    status: 'PENDING',
    createdAt: new Date('2026-06-26'),
    userId: null,
    ...overrides,
  };
}

function getInsertedAirlines(): string[] {
  return queryMock.mock.calls
    .filter(([sql]) => String(sql).includes('INSERT INTO "Flight"'))
    .map(([, params]) => (params as unknown[])[2] as string);
}

describe('processSearchJob — avoidedAirlines', () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([]);
    queryOneMock.mockReset();
    searchMock.mockClear().mockResolvedValue(scrapedFlights);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('excludes flights from airlines the user asked to avoid', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ avoidedAirlines: ['Spirit'] }));

    await processSearchJob({ searchQueryId: 'sq1' });

    expect(getInsertedAirlines()).toEqual(['United', 'Delta']);
  });

  it('matches case-insensitively', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ avoidedAirlines: ['spirit', 'DELTA'] }));

    await processSearchJob({ searchQueryId: 'sq1' });

    expect(getInsertedAirlines()).toEqual(['United']);
  });

  it('inserts every flight when no airlines are avoided', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ avoidedAirlines: [] }));

    await processSearchJob({ searchQueryId: 'sq1' });

    expect(getInsertedAirlines()).toEqual(['United', 'Spirit', 'Delta']);
  });
});

describe('processSearchJob — flexible dates', () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([]);
    queryOneMock.mockReset();
    searchMock.mockClear().mockResolvedValue(scrapedFlights);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('calls the scraper once when flexible dates is off', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ flexibleDates: false }));

    await processSearchJob({ searchQueryId: 'sq1' });

    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('calls the scraper once per candidate date on a one-way search (no return leg to vary)', async () => {
    queryOneMock.mockResolvedValue(
      makeSearchQuery({ flexibleDates: true, flexibleDateRangeDays: 2, returnDate: null })
    );

    await processSearchJob({ searchQueryId: 'sq1' });

    // departure ±2 days = 5 candidate dates, no return leg to vary independently.
    expect(searchMock).toHaveBeenCalledTimes(5);
    const departureDates = searchMock.mock.calls
      .map(([params]) => (params as { departureDate: Date }).departureDate.toISOString().slice(0, 10))
      .sort();
    expect(departureDates).toEqual(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03']);
  });

  it('varies departure and return independently on a round trip, deduping the shared base pair', async () => {
    queryOneMock.mockResolvedValue(
      makeSearchQuery({
        flexibleDates: true,
        flexibleDateRangeDays: 2,
        returnDate: new Date('2026-07-08'),
      })
    );

    await processSearchJob({ searchQueryId: 'sq1' });

    // 5 departure variants (return fixed) + 5 return variants (departure fixed) - 1 shared base pair = 9.
    expect(searchMock).toHaveBeenCalledTimes(9);
  });

  it('clamps flexibleDateRangeDays to the server-side max regardless of what was stored', async () => {
    queryOneMock.mockResolvedValue(
      makeSearchQuery({ flexibleDates: true, flexibleDateRangeDays: 10, returnDate: null })
    );

    await processSearchJob({ searchQueryId: 'sq1' });

    // Clamped to 5: ±5 days = 11 candidate dates, not 21.
    expect(searchMock).toHaveBeenCalledTimes(11);
  });
});
