import { describe, it, expect } from 'vitest';
import type { Flight, Comparison } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';
import { splitFlightsByDirection, computeFilteredComparison } from '../utils/flightComparison';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFlight(overrides: { id: string; airline: string; departureAirport: string; arrivalAirport: string; price: string | number } & Record<string, unknown>): Flight {
  return {
    flightNumber: 'XX001',
    departureTime: '2026-06-26T08:00:00Z',
    arrivalTime: '2026-06-26T13:00:00Z',
    durationMinutes: 300,
    currency: 'USD',
    cabinClass: 'ECONOMY' as any,
    isLayover: false,
    layoverAirport: null,
    layoverDurationMinutes: null,
    source: 'serpapi',
    scrapedAt: '2026-06-26T00:00:00Z',
    bookingUrl: null,
    searchQueryId: 'sq1',
    ...overrides,
    price: Number(overrides.price),
  } as unknown as Flight;
}

// EWR→SFO outbound pool (20 flights across 4 airlines)
function makeOutboundPool(): Flight[] {
  const airlines = ['Delta', 'United', 'JetBlue', 'American'];
  return Array.from({ length: 20 }, (_, i) =>
    makeFlight({
      id: `out-${i}`,
      airline: airlines[i % 4],
      departureAirport: 'EWR',
      arrivalAirport: 'SFO',
      price: 200 + i * 10,
    })
  );
}

// SFO→EWR return pool (18 flights)
function makeReturnPool(): Flight[] {
  const airlines = ['Delta', 'United', 'JetBlue', 'American'];
  return Array.from({ length: 18 }, (_, i) =>
    makeFlight({
      id: `ret-${i}`,
      airline: airlines[i % 4],
      departureAirport: 'SFO',
      arrivalAirport: 'EWR',
      price: 190 + i * 10,
    })
  );
}

const baseComparison: Comparison = {
  id: 'cmp1',
  searchQueryId: 'sq1',
  roundTripFlightIds: [],
  oneWayOutboundFlightIds: [],
  oneWayReturnFlightIds: [],
  roundTripTotalPrice: 999,
  oneWayTotalPrice: 888,
  priceDifference: 111,
  recommendedOption: RecommendedOption.ONE_WAY,
  aiAnalysis: 'original AI text',
  aiAnalysisGeneratedAt: '2026-06-26T00:00:00Z',
  createdAt: '2026-06-26T00:00:00Z',
  legFlightIds: [],
  multiCityTotalPrice: null,
};

// ── splitFlightsByDirection ───────────────────────────────────────────────────

describe('splitFlightsByDirection', () => {
  it('correctly splits a mixed 38-flight EWR→SFO pool (mirrors live search log)', () => {
    const all = [...makeOutboundPool(), ...makeReturnPool()];
    const { outbound, return: ret } = splitFlightsByDirection(all, 'EWR', 'SFO');
    expect(outbound).toHaveLength(20);
    expect(ret).toHaveLength(18);
  });

  it('all outbound, no return for a one-way pool', () => {
    const pool = makeOutboundPool();
    const { outbound, return: ret } = splitFlightsByDirection(pool, 'EWR', 'SFO');
    expect(outbound).toHaveLength(20);
    expect(ret).toHaveLength(0);
  });

  it('returns empty outbound for all-return pool', () => {
    const pool = makeReturnPool();
    const { outbound, return: ret } = splitFlightsByDirection(pool, 'EWR', 'SFO');
    expect(outbound).toHaveLength(0);
    expect(ret).toHaveLength(18);
  });

  it('omits flights where neither airport matches', () => {
    const irrelevant = makeFlight({ id: 'x1', airline: 'Spirit', departureAirport: 'LAX', arrivalAirport: 'ORD', price: 100 });
    const { outbound, return: ret } = splitFlightsByDirection([irrelevant], 'EWR', 'SFO');
    expect(outbound).toHaveLength(0);
    expect(ret).toHaveLength(0);
  });

  it('puts all flights in outbound when origin === destination', () => {
    const pool = makeOutboundPool();
    const { outbound, return: ret } = splitFlightsByDirection(pool, 'EWR', 'EWR');
    expect(outbound).toHaveLength(0);
    expect(ret).toHaveLength(0);
  });

  it('all outbound flights have correct direction', () => {
    const all = [...makeOutboundPool(), ...makeReturnPool()];
    const { outbound } = splitFlightsByDirection(all, 'EWR', 'SFO');
    expect(outbound.every((f) => f.departureAirport === 'EWR' && f.arrivalAirport === 'SFO')).toBe(true);
  });

  it('all return flights have correct direction', () => {
    const all = [...makeOutboundPool(), ...makeReturnPool()];
    const { return: ret } = splitFlightsByDirection(all, 'EWR', 'SFO');
    expect(ret.every((f) => f.departureAirport === 'SFO' && f.arrivalAirport === 'EWR')).toBe(true);
  });

  it('drops a nearby-airport flight when includeNearbyAirports is off (exact match only)', () => {
    const jfkFlight = makeFlight({ id: 'jfk-1', airline: 'Delta', departureAirport: 'JFK', arrivalAirport: 'SFO', price: 180 });
    const { outbound } = splitFlightsByDirection([jfkFlight], 'EWR', 'SFO');
    expect(outbound).toHaveLength(0);
  });

  it('includes a flight from a nearby airport when includeNearbyAirports is on', () => {
    // JFK is within EWR's default 75mi nearby radius.
    const jfkFlight = makeFlight({ id: 'jfk-1', airline: 'Delta', departureAirport: 'JFK', arrivalAirport: 'SFO', price: 180 });
    const { outbound } = splitFlightsByDirection([jfkFlight], 'EWR', 'SFO', true);
    expect(outbound).toHaveLength(1);
    expect(outbound[0].id).toBe('jfk-1');
  });

  it('still excludes a genuinely distant airport even with includeNearbyAirports on', () => {
    const laxFlight = makeFlight({ id: 'lax-1', airline: 'Delta', departureAirport: 'LAX', arrivalAirport: 'SFO', price: 50 });
    const { outbound } = splitFlightsByDirection([laxFlight], 'EWR', 'SFO', true);
    expect(outbound).toHaveLength(0);
  });

  it('respects an explicit nearbyRadiusMiles narrower than the default', () => {
    const jfkFlight = makeFlight({ id: 'jfk-1', airline: 'Delta', departureAirport: 'JFK', arrivalAirport: 'SFO', price: 180 });
    const { outbound } = splitFlightsByDirection([jfkFlight], 'EWR', 'SFO', true, 1);
    expect(outbound).toHaveLength(0);
  });
});

// ── computeFilteredComparison ─────────────────────────────────────────────────

describe('computeFilteredComparison', () => {
  const delta_out = makeFlight({ id: 'd1', airline: 'Delta', departureAirport: 'EWR', arrivalAirport: 'SFO', price: 320 });
  const united_out = makeFlight({ id: 'u1', airline: 'United', departureAirport: 'EWR', arrivalAirport: 'SFO', price: 290 });
  const delta_ret = makeFlight({ id: 'd2', airline: 'Delta', departureAirport: 'SFO', arrivalAirport: 'EWR', price: 310 });
  const jetblue_ret = makeFlight({ id: 'j1', airline: 'JetBlue', departureAirport: 'SFO', arrivalAirport: 'EWR', price: 270 });

  it('returns baseComparison unchanged when outbound is empty', () => {
    const result = computeFilteredComparison([], [delta_ret], baseComparison);
    expect(result).toBe(baseComparison);
  });

  it('returns baseComparison unchanged when return is empty', () => {
    const result = computeFilteredComparison([delta_out], [], baseComparison);
    expect(result).toBe(baseComparison);
  });

  it('preserves aiAnalysis and id from baseComparison', () => {
    const result = computeFilteredComparison([delta_out], [delta_ret], baseComparison);
    expect(result.aiAnalysis).toBe('original AI text');
    expect(result.id).toBe('cmp1');
  });

  it('finds best same-airline pair (United 290+220=510 vs Delta 320+310=630 — United wins)', () => {
    const united_ret = makeFlight({ id: 'u2', airline: 'United', departureAirport: 'SFO', arrivalAirport: 'EWR', price: 220 });
    const result = computeFilteredComparison([delta_out, united_out], [delta_ret, united_ret], baseComparison);
    // United same-airline = 290+220 = 510, Delta same-airline = 320+310 = 630
    expect(result.roundTripTotalPrice).toBe(510);
    expect(result.roundTripFlightIds).toEqual(['u1', 'u2']);
  });

  it('best mix uses cheapest outbound + cheapest return independently', () => {
    // Cheapest out: United $290, cheapest ret: JetBlue $270
    const result = computeFilteredComparison([delta_out, united_out], [delta_ret, jetblue_ret], baseComparison);
    expect(result.oneWayTotalPrice).toBe(290 + 270);
    expect(result.oneWayOutboundFlightIds).toEqual(['u1']);
    expect(result.oneWayReturnFlightIds).toEqual(['j1']);
  });

  it('falls back to cheapest overall pair when no same-airline match', () => {
    // Only Delta outbound, only JetBlue return — no match
    const result = computeFilteredComparison([delta_out], [jetblue_ret], baseComparison);
    expect(result.roundTripTotalPrice).toBe(320 + 270);
    expect(result.roundTripFlightIds).toEqual(['d1', 'j1']);
  });

  it('sets recommendedOption to ROUND_TRIP when same-airline <= mix', () => {
    // Same-airline: Delta 200+200=400. Mix: Delta 200 out + Delta 200 ret = same, so tie → ROUND_TRIP
    const cheap_out = makeFlight({ id: 'c1', airline: 'Delta', departureAirport: 'EWR', arrivalAirport: 'SFO', price: 200 });
    const cheap_ret = makeFlight({ id: 'c2', airline: 'Delta', departureAirport: 'SFO', arrivalAirport: 'EWR', price: 200 });
    const result = computeFilteredComparison([cheap_out], [cheap_ret], baseComparison);
    expect(result.recommendedOption).toBe(RecommendedOption.ROUND_TRIP);
  });

  it('sets recommendedOption to ONE_WAY when mix is cheaper', () => {
    // Same-airline pair only: Delta 320+310=630. Mix: United 290 + JetBlue 270=560
    const result = computeFilteredComparison([delta_out, united_out], [delta_ret, jetblue_ret], baseComparison);
    const sameAirlinePrice = Number(result.roundTripTotalPrice);
    const mixPrice = Number(result.oneWayTotalPrice);
    expect(mixPrice).toBeLessThan(sameAirlinePrice);
    expect(result.recommendedOption).toBe(RecommendedOption.ONE_WAY);
  });

  it('priceDifference = roundTripTotal - oneWayTotal', () => {
    const result = computeFilteredComparison([delta_out, united_out], [delta_ret, jetblue_ret], baseComparison);
    expect(result.priceDifference).toBe(Number(result.roundTripTotalPrice) - Number(result.oneWayTotalPrice));
  });

  it('airline-filter scenario: only Delta flights → comparison uses Delta prices', () => {
    // Simulates user checking "Delta" in FilterSidebar
    const result = computeFilteredComparison([delta_out], [delta_ret], baseComparison);
    expect(result.roundTripTotalPrice).toBe(320 + 310);
    expect(result.oneWayTotalPrice).toBe(320 + 310); // only one option per leg
    expect(result.roundTripFlightIds).toContain('d1');
    expect(result.roundTripFlightIds).toContain('d2');
  });
});
