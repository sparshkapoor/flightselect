import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DbSearchQuery, DbFlight, DbSearchLeg } from '../types/db';

const queryMock = vi.fn();
const queryOneMock = vi.fn();

vi.mock('../config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  queryOne: (...args: unknown[]) => queryOneMock(...args),
}));

import { processComparisonJob } from './comparison.job';

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
    includeNearbyAirports: false,
    nearbyRadiusMiles: null,
    status: 'COMPLETED',
    createdAt: new Date('2026-06-26'),
    userId: null,
    ...overrides,
  };
}

function makeFlight(overrides: Partial<DbFlight> & { id: string; price: string }): DbFlight {
  return {
    airline: 'Delta',
    flightNumber: 'DL100',
    departureAirport: 'EWR',
    arrivalAirport: 'SFO',
    departureTime: new Date('2026-07-01T08:00:00Z'),
    arrivalTime: new Date('2026-07-01T11:00:00Z'),
    durationMinutes: 360,
    currency: 'USD',
    cabinClass: 'ECONOMY',
    isLayover: false,
    layoverAirport: null,
    layoverDurationMinutes: null,
    source: 'serpapi',
    scrapedAt: new Date('2026-06-26'),
    bookingUrl: null,
    rawData: null,
    searchQueryId: 'sq1',
    ...overrides,
  };
}

function getInsertedComparisonParams(): unknown[] {
  const insertCall = queryMock.mock.calls.find(([sql]) =>
    String(sql).includes('INSERT INTO "Comparison"')
  );
  if (!insertCall) throw new Error('No INSERT INTO "Comparison" call was made');
  return insertCall[1] as unknown[];
}

describe('processComparisonJob', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryOneMock.mockReset();
  });

  it('stores a null round-trip price instead of a fabricated one when there are no return flights', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery());
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([
          makeFlight({ id: 'out-1', price: '200.00' }),
          makeFlight({ id: 'out-2', price: '250.00' }),
        ]);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const [, , roundTripFlightIds, oneWayOutboundFlightIds, oneWayReturnFlightIds,
      roundTripTotalPrice, oneWayTotalPrice, priceDifference, recommendedOption] =
      getInsertedComparisonParams();

    expect(roundTripTotalPrice).toBeNull();
    expect(priceDifference).toBeNull();
    expect(oneWayTotalPrice).toBe(200); // cheapest real outbound price, not inflated
    expect(recommendedOption).toBe('ONE_WAY');
    expect(roundTripFlightIds).toEqual([]);
    expect(oneWayOutboundFlightIds).toEqual(['out-1']);
    expect(oneWayReturnFlightIds).toEqual([]);
  });

  it('stores a real computed round-trip price when return flights exist', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ tripType: 'ROUND_TRIP', returnDate: new Date('2026-07-08') }));
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([
          makeFlight({ id: 'out-1', price: '200.00', airline: 'Delta' }),
          makeFlight({ id: 'ret-1', price: '180.00', airline: 'Delta', departureAirport: 'SFO', arrivalAirport: 'EWR' }),
        ]);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const [, , , , , roundTripTotalPrice, , priceDifference] = getInsertedComparisonParams();

    expect(roundTripTotalPrice).toBe(380); // real same-airline combo, not a multiplier
    expect(priceDifference).not.toBeNull();
  });
});

describe('processComparisonJob — nearby airports', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryOneMock.mockReset();
  });

  it('recognizes a flight departing a nearby airport as part of the route, not just the exact requested origin', async () => {
    // EWR was requested; JFK is within the default 75mi nearby radius and is
    // actually cheaper — must be picked up, not silently dropped by an exact match.
    queryOneMock.mockResolvedValue(
      makeSearchQuery({ originAirport: 'EWR', destinationAirport: 'SFO', includeNearbyAirports: true })
    );
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([
          makeFlight({ id: 'ewr-flight', price: '250.00', departureAirport: 'EWR', arrivalAirport: 'SFO' }),
          makeFlight({ id: 'jfk-flight', price: '180.00', departureAirport: 'JFK', arrivalAirport: 'SFO' }),
        ]);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const [, , , oneWayOutboundFlightIds, , , oneWayTotalPrice] = getInsertedComparisonParams();

    expect(oneWayOutboundFlightIds).toEqual(['jfk-flight']);
    expect(oneWayTotalPrice).toBe(180); // the nearby airport's cheaper flight, picked as the hero
  });

  it('ignores a non-nearby airport even when includeNearbyAirports is on', async () => {
    // LAX is nowhere near EWR — must not be swept in just because expansion is enabled.
    queryOneMock.mockResolvedValue(
      makeSearchQuery({ originAirport: 'EWR', destinationAirport: 'SFO', includeNearbyAirports: true })
    );
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([
          makeFlight({ id: 'ewr-flight', price: '250.00', departureAirport: 'EWR', arrivalAirport: 'SFO' }),
          makeFlight({ id: 'lax-flight', price: '50.00', departureAirport: 'LAX', arrivalAirport: 'SFO' }),
        ]);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const [, , , oneWayOutboundFlightIds, , , oneWayTotalPrice] = getInsertedComparisonParams();

    expect(oneWayOutboundFlightIds).toEqual(['ewr-flight']);
    expect(oneWayTotalPrice).toBe(250);
  });

  it('falls back to exact-match only when includeNearbyAirports is off', async () => {
    queryOneMock.mockResolvedValue(
      makeSearchQuery({ originAirport: 'EWR', destinationAirport: 'SFO', includeNearbyAirports: false })
    );
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([
          makeFlight({ id: 'ewr-flight', price: '250.00', departureAirport: 'EWR', arrivalAirport: 'SFO' }),
          makeFlight({ id: 'jfk-flight', price: '180.00', departureAirport: 'JFK', arrivalAirport: 'SFO' }),
        ]);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const [, , , oneWayOutboundFlightIds] = getInsertedComparisonParams();

    expect(oneWayOutboundFlightIds).toEqual(['ewr-flight']);
  });
});

describe('processComparisonJob — multi-city', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryOneMock.mockReset();
  });

  function makeLeg(overrides: Partial<DbSearchLeg> & { id: string; legIndex: number }): DbSearchLeg {
    return {
      searchQueryId: 'sq1',
      originAirport: 'EWR',
      destinationAirport: 'LAS',
      departureDate: new Date('2026-07-06'),
      ...overrides,
    };
  }

  it('picks the cheapest flight per leg and sums them into multiCityTotalPrice', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ tripType: 'MULTI_CITY' }));
    const legs = [
      makeLeg({ id: 'leg-1', legIndex: 0 }),
      makeLeg({ id: 'leg-2', legIndex: 1, originAirport: 'LAS', destinationAirport: 'ORD' }),
      makeLeg({ id: 'leg-3', legIndex: 2, originAirport: 'ORD', destinationAirport: 'EWR' }),
    ];
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([
          makeFlight({ id: 'leg1-cheap', price: '200.00', searchLegId: "leg-1" }),
          makeFlight({ id: 'leg1-pricey', price: '300.00', searchLegId: "leg-1" }),
          makeFlight({ id: 'leg2-cheap', price: '150.00', searchLegId: "leg-2" }),
          makeFlight({ id: 'leg3-cheap', price: '220.00', searchLegId: "leg-3" }),
        ]);
      }
      if (String(sql).startsWith('SELECT * FROM "SearchLeg"')) {
        return Promise.resolve(legs);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const params = getInsertedComparisonParams();
    const recommendedOption = params[8];
    const legFlightIds = params[11];
    const multiCityTotalPrice = params[12];

    expect(recommendedOption).toBe('MULTI_CITY');
    expect(legFlightIds).toEqual(['leg1-cheap', 'leg2-cheap', 'leg3-cheap']);
    expect(multiCityTotalPrice).toBe(570); // 200 + 150 + 220
  });

  it('skips creating a comparison when a leg has no flights at all', async () => {
    queryOneMock.mockResolvedValue(makeSearchQuery({ tripType: 'MULTI_CITY' }));
    const legs = [
      makeLeg({ id: 'leg-1', legIndex: 0 }),
      makeLeg({ id: 'leg-2', legIndex: 1, originAirport: 'LAS', destinationAirport: 'ORD' }),
    ];
    queryMock.mockImplementation((sql: string) => {
      if (String(sql).startsWith('SELECT * FROM "Flight"')) {
        return Promise.resolve([makeFlight({ id: 'leg1-only', price: '200.00', searchLegId: "leg-1" })]);
      }
      if (String(sql).startsWith('SELECT * FROM "SearchLeg"')) {
        return Promise.resolve(legs);
      }
      return Promise.resolve([]);
    });

    await processComparisonJob({ searchQueryId: 'sq1' });

    const insertCall = queryMock.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO "Comparison"'));
    expect(insertCall).toBeUndefined();
  });
});
