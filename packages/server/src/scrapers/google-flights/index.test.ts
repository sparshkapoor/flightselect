import { describe, it, expect } from 'vitest';
import { normalizeFlight, buildGoogleFlightsUrl } from './index';
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

describe('buildGoogleFlightsUrl', () => {
  it('one-way: no returnDate in URL', () => {
    const url = buildGoogleFlightsUrl('JFK', 'LAX', '2024-06-01');
    expect(url).toContain('JFK');
    expect(url).toContain('LAX');
    expect(url).toContain('2024-06-01');
    expect(url).not.toContain('return');
  });

  it('round-trip: returnDate appended', () => {
    const url = buildGoogleFlightsUrl('JFK', 'LAX', '2024-06-01', '2024-06-08');
    expect(url).toContain('return');
    expect(url).toContain('2024-06-08');
  });
});
