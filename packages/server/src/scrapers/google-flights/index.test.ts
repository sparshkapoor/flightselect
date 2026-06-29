import { describe, it, expect } from 'vitest';
import { normalizeFlight, buildGoogleFlightsUrl } from './index';
import {
  buildGoogleFlightsTfsUrl,
  deriveBookingUrl,
  parseSegmentsFromBookingToken,
  buildGoogleFlightsTfsUrlFromSegments,
  buildGoogleFlightsRoundTripTfsUrl,
  deriveRoundTripBookingUrl,
  FlightSegment,
} from '../../utils/googleFlightsUrl';
import { CabinClass } from '@flightselect/shared';

const seg = (departure: string, arrival: string, durationMinutes: number, airline = 'Delta', flightNumber = 'DL100') => ({
  departure_airport: { id: departure, name: departure, time: `2024-06-01T${departure === 'JFK' ? '08:00' : '12:00'}:00` },
  arrival_airport: { id: arrival, name: arrival, time: `2024-06-01T${arrival === 'ATL' ? '10:00' : '14:00'}:00` },
  duration: durationMinutes,
  airline,
  flight_number: flightNumber,
});

const directResult = {
  price: 300,
  flights: [seg('JFK', 'LAX', 330)],
  total_duration: 330,
};

const layoverWithExplicit = {
  price: 400,
  flights: [
    {
      ...seg('JFK', 'ATL', 120),
      layovers: [{ id: 'ATL', name: 'Atlanta', duration: 60 }],
    },
    seg('ATL', 'LAX', 210),
  ],
  total_duration: 390,
};

const layoverFallback = {
  price: 450,
  flights: [
    {
      ...seg('JFK', 'ATL', 120),
      departure_airport: { id: 'JFK', name: 'JFK', time: '2024-06-01T08:00:00' },
      arrival_airport: { id: 'ATL', name: 'ATL', time: '2024-06-01T10:00:00' },
    },
    {
      ...seg('ATL', 'LAX', 210),
      departure_airport: { id: 'ATL', name: 'ATL', time: '2024-06-01T11:00:00' },
      arrival_airport: { id: 'LAX', name: 'LAX', time: '2024-06-01T14:00:00' },
    },
  ],
  total_duration: 390,
};

describe('normalizeFlight', () => {
  it('direct flight has isLayover=false and null layover fields', () => {
    const result = normalizeFlight(directResult as any, 1, CabinClass.ECONOMY, '2024-06-01');
    expect(result.isLayover).toBe(false);
    expect(result.layoverAirport).toBeNull();
    expect(result.layoverDurationMinutes).toBeNull();
  });

  it('scales price by passenger count', () => {
    const result = normalizeFlight(directResult as any, 2, CabinClass.ECONOMY, '2024-06-01');
    expect(result.price).toBe(600);
  });

  it('layover via explicit layovers array sets correct IATA and duration', () => {
    const result = normalizeFlight(layoverWithExplicit as any, 1, CabinClass.ECONOMY, '2024-06-01');
    expect(result.isLayover).toBe(true);
    expect(result.layoverAirport).toBe('ATL');
    expect(result.layoverDurationMinutes).toBe(60);
  });

  it('layover via fallback uses arrival_airport.id and estimates duration', () => {
    const result = normalizeFlight(layoverFallback as any, 1, CabinClass.ECONOMY, '2024-06-01');
    expect(result.isLayover).toBe(true);
    expect(result.layoverAirport).toBe('ATL');
    expect(result.layoverDurationMinutes).toBe(60); // 11:00 - 10:00
  });

  it('sets source to google-flights', () => {
    const result = normalizeFlight(directResult as any, 1, CabinClass.ECONOMY, '2024-06-01');
    expect(result.source).toBe('google-flights');
  });

  it('stores bookingToken in rawData', () => {
    const withToken = { ...directResult, booking_token: 'tok123' };
    const result = normalizeFlight(withToken as any, 1, CabinClass.ECONOMY, '2024-06-01');
    expect((result.rawData as any).bookingToken).toBe('tok123');
  });
});

describe('normalizeFlight timezone handling', () => {
  // SerpAPI sends airport-LOCAL wall-clock time with no timezone marker, in
  // either "YYYY-MM-DD HH:MM" (real API) or "YYYY-MM-DDTHH:MM:SS" (this repo's
  // mocks) form. Regardless of the machine running this test, the parsed
  // result must reproduce the exact same digits via getUTC*() — proving the
  // server-timezone-dependent bug (`new Date(localString)`) is gone.
  const spaceFormatResult = {
    price: 500,
    flights: [{
      departure_airport: { id: 'EWR', name: 'EWR', time: '2026-07-02 17:00' },
      arrival_airport: { id: 'SFO', name: 'SFO', time: '2026-07-02 20:35' },
      duration: 335,
      airline: 'United',
      flight_number: 'UA100',
    }],
    total_duration: 335,
  };

  it('preserves SerpAPI\'s space-separated local wall-clock digits via getUTC*()', () => {
    const result = normalizeFlight(spaceFormatResult as any, 1, CabinClass.ECONOMY, '2026-07-02');
    expect(result.departureTime.getUTCHours()).toBe(17);
    expect(result.departureTime.getUTCMinutes()).toBe(0);
    expect(result.arrivalTime.getUTCHours()).toBe(20);
    expect(result.arrivalTime.getUTCMinutes()).toBe(35);
  });

  it('preserves the T-separated mock format the same way', () => {
    const result = normalizeFlight(directResult as any, 1, CabinClass.ECONOMY, '2024-06-01');
    // seg('JFK', 'LAX', ...) departs JFK at "08:00", arrives LAX at "14:00"
    expect(result.departureTime.getUTCHours()).toBe(8);
    expect(result.departureTime.getUTCMinutes()).toBe(0);
    expect(result.arrivalTime.getUTCHours()).toBe(14);
    expect(result.arrivalTime.getUTCMinutes()).toBe(0);
  });
});

describe('buildGoogleFlightsUrl', () => {
  it('produces a one-way search URL with no return date', () => {
    const url = buildGoogleFlightsUrl('JFK', 'LAX', '2024-06-01');
    expect(url).toContain('JFK');
    expect(url).toContain('LAX');
    expect(url).toContain('2024-06-01');
    expect(url).not.toContain('return');
  });
});

describe('buildGoogleFlightsTfsUrl', () => {
  it('produces a tfs deep-link URL for a specific one-way flight', () => {
    const url = buildGoogleFlightsTfsUrl('EWR', 'SFO', '2026-06-17', 'UA', '1343');
    expect(url).toContain('/search?tfs=');
    expect(url).not.toContain('return');
    const tfs = new URL(url).searchParams.get('tfs')!;
    expect(tfs).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = Buffer.from(tfs, 'base64url').toString('binary');
    expect(decoded).toContain('EWR');
    expect(decoded).toContain('SFO');
    expect(decoded).toContain('2026-06-17');
    expect(decoded).toContain('UA');
    expect(decoded).toContain('1343');

    // Trip type is field 19 (varint), not field 2 — both trip types set
    // field 2 = 2. One-way must end with field19=2 (hex 980102), proving
    // it doesn't accidentally trigger Google's "choose your return" step.
    const hex = Buffer.from(tfs, 'base64url').toString('hex');
    expect(hex).toContain('081c1002');
    expect(hex).toContain('980102');
  });
});

describe('deriveBookingUrl', () => {
  it('returns a tfs URL for a parseable flight number', () => {
    const url = deriveBookingUrl('UA 2058', 'EWR', 'SFO', new Date('2026-06-19T16:25:00'));
    expect(url).toContain('/search?tfs=');
    const tfs = new URL(url).searchParams.get('tfs')!;
    const decoded = Buffer.from(tfs, 'base64url').toString('binary');
    expect(decoded).toContain('EWR');
    expect(decoded).toContain('SFO');
    expect(decoded).toContain('2026-06-19');
    expect(decoded).toContain('UA');
    expect(decoded).toContain('2058');
  });

  it('falls back to search URL for unparseable flight number', () => {
    const url = deriveBookingUrl('Unknown', 'EWR', 'SFO', new Date('2026-06-19T16:25:00'));
    expect(url).toContain('?q=Flights+from+EWR+to+SFO');
    expect(url).not.toContain('tfs=');
    expect(url).not.toContain('return');
  });

  it('falls back to search URL for a connecting flight with no usable booking token', () => {
    // No rawData/bookingToken supplied — only the single stored segment's
    // flight number, which can't represent a whole connecting itinerary.
    const url = deriveBookingUrl('UA 546', 'EWR', 'LAS', new Date('2026-07-03T16:19:00'), true);
    expect(url).toContain('?q=Flights+from+EWR+to+LAS');
    expect(url).not.toContain('tfs=');
  });

  it('builds an accurate multi-segment tfs for a connecting flight when rawData.bookingToken is present', () => {
    // Real SerpAPI bookingToken for EWR->PDX (AS1630) -> LAS (AS757).
    const rawData = {
      bookingToken:
        'WyJDalJJTldONlYwVktkMHA2WW1OQlUzbHJTVUZDUnkwdExTMHRMUzB0TFhaM2EzRXhNa0ZCUVVGQlIzQkNOVmhqUTNnNExXbEJFZ3hCVXpFMk16QjhRVk0zTlRjYUN3anMvZ0VRQWhvRFZWTkVPQnh3N1A0QiIsW1siRVdSIiwiMjAyNi0wNy0wNCIsIlBEWCIsbnVsbCwiQVMiLCIxNjMwIl0sWyJQRFgiLCIyMDI2LTA3LTA0IiwiTEFTIixudWxsLCJBUyIsIjc1NyJdXV0=',
    };
    const url = deriveBookingUrl('AS 1630', 'EWR', 'LAS', new Date('2026-07-04T06:30:00'), true, rawData);
    expect(url).toContain('/search?tfs=');

    const tfs = new URL(url).searchParams.get('tfs')!;
    const decoded = Buffer.from(tfs, 'base64url').toString('binary');
    expect(decoded).toContain('EWR');
    expect(decoded).toContain('PDX');
    expect(decoded).toContain('LAS');
    expect(decoded).toContain('1630');
    expect(decoded).toContain('757');
  });
});

describe('buildGoogleFlightsTfsUrlFromSegments', () => {
  it('matches Google\'s own tfs bytes for a real connecting itinerary, byte-for-byte', () => {
    // Ground truth: real SerpAPI bookingToken for this flight (EWR->PDX->LAS,
    // AS1630/AS757), and a tfs Google itself issued (via the real Google
    // Flights UI, captured by the user) for the same itinerary.
    const segments = parseSegmentsFromBookingToken(
      'WyJDalJJTldONlYwVktkMHA2WW1OQlUzbHJTVUZDUnkwdExTMHRMUzB0TFhaM2EzRXhNa0ZCUVVGQlIzQkNOVmhqUTNnNExXbEJFZ3hCVXpFMk16QjhRVk0zTlRjYUN3anMvZ0VRQWhvRFZWTkVPQnh3N1A0QiIsW1siRVdSIiwiMjAyNi0wNy0wNCIsIlBEWCIsbnVsbCwiQVMiLCIxNjMwIl0sWyJQRFgiLCIyMDI2LTA3LTA0IiwiTEFTIixudWxsLCJBUyIsIjc1NyJdXV0='
    )!;
    const url = buildGoogleFlightsTfsUrlFromSegments(segments, 'EWR', 'LAS');
    const tfs = new URL(url).searchParams.get('tfs')!;

    // The leg bytes Google's real round-trip booking tfs used for this exact
    // outbound itinerary (extracted from a captured google.com/travel/flights
    // booking URL — see HANDOFF_NEXT_SESSION.md).
    const googleLegHex =
      '120a323032362d30372d303422200a03455752120a323032362d30372d30341a035044582a024153320431363330221f0a03504458120a323032362d30372d30341a034c41532a0241533203373537320241536a07080112034557527207080112034c4153';

    const decoded = Buffer.from(tfs, 'base64url');
    // Our tfs wraps the same leg bytes in the top-level message (field 1/2 header
    // then field 3 = leg, then trailing fields) — assert the leg bytes appear
    // verbatim, proving the segment encoding itself is byte-identical to Google's.
    const hex = decoded.toString('hex');
    expect(hex).toContain(googleLegHex);

    // This is the one-way builder — trip type (field 19) must be 2, not 1.
    expect(hex).toContain('980102');
  });
});

describe('buildGoogleFlightsRoundTripTfsUrl', () => {
  it('combines both legs under a round-trip marker, reusing the same byte-verified leg encoding as the one-way builder', () => {
    // Reuse the exact same outbound segments + leg bytes already verified
    // byte-for-byte against a real Google-issued tfs above.
    const outboundSegments = parseSegmentsFromBookingToken(
      'WyJDalJJTldONlYwVktkMHA2WW1OQlUzbHJTVUZDUnkwdExTMHRMUzB0TFhaM2EzRXhNa0ZCUVVGQlIzQkNOVmhqUTNnNExXbEJFZ3hCVXpFMk16QjhRVk0zTlRjYUN3anMvZ0VRQWhvRFZWTkVPQnh3N1A0QiIsW1siRVdSIiwiMjAyNi0wNy0wNCIsIlBEWCIsbnVsbCwiQVMiLCIxNjMwIl0sWyJQRFgiLCIyMDI2LTA3LTA0IiwiTEFTIixudWxsLCJBUyIsIjc1NyJdXV0='
    )!;
    const returnSegments: FlightSegment[] = [
      { origin: 'LAS', date: '2026-07-11', dest: 'EWR', airline: 'AS', flightNum: '999' },
    ];

    const googleLegHex =
      '120a323032362d30372d303422200a03455752120a323032362d30372d30341a035044582a024153320431363330221f0a03504458120a323032362d30372d30341a034c41532a0241533203373537320241536a07080112034557527207080112034c4153';

    const url = buildGoogleFlightsRoundTripTfsUrl(
      outboundSegments, 'EWR', 'LAS',
      returnSegments, 'LAS', 'EWR',
    );
    expect(url).toContain('/search?tfs=');

    const tfs = new URL(url).searchParams.get('tfs')!;
    const decoded = Buffer.from(tfs, 'base64url');
    const hex = decoded.toString('hex');
    const binary = decoded.toString('binary');

    // field 1 = 28, field 2 = 2 (081c1002) on BOTH trip types — verified
    // against real Google-issued one-way and round-trip URLs the user
    // captured live; field 2 does NOT encode trip type.
    expect(hex).toContain('081c1002');

    // Trip type is field 19: varint(1) = round trip (980101 = tag 0x98 0x01,
    // value 1). Proves this didn't silently fall back to the one-way
    // encoding (which would end 980102).
    expect(hex).toContain('980101');
    expect(hex).not.toContain('980102');

    // Outbound leg bytes appear verbatim (same real Google-verified leg as above).
    expect(hex).toContain(googleLegHex);

    // Return leg's identifying data is present as its own segment.
    expect(binary).toContain('LAS');
    expect(binary).toContain('EWR');
    expect(binary).toContain('999');
  });

  it('returns null from deriveRoundTripBookingUrl when either leg lacks a parseable bookingToken', () => {
    const outbound = { departureAirport: 'EWR', arrivalAirport: 'LAS', rawData: { bookingToken: 'not-real-json' } };
    const ret = { departureAirport: 'LAS', arrivalAirport: 'EWR', rawData: null };
    expect(deriveRoundTripBookingUrl(outbound, ret)).toBeNull();
  });
});

describe('normalizeFlight bookingUrl', () => {
  it('does not set bookingUrl (derived by service layer, not cached)', () => {
    const result = normalizeFlight(directResult as any, 1, CabinClass.ECONOMY, '2024-06-01');
    expect(result.bookingUrl).toBeNull();
  });
});
