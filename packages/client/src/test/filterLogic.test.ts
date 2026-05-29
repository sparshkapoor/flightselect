import { describe, it, expect } from 'vitest';
import type { Flight } from '@flightselect/shared';

// Mirror of the filter predicates in SearchResultsPage.tsx
function applyFilters(
  flights: Partial<Flight>[],
  filters: {
    maxPrice?: number;
    minPrice?: number;
    maxLayovers?: number;
    selectedAirlines?: string[];
    maxDurationMinutes?: number;
    departureTimeStart?: string;
    departureTimeEnd?: string;
  }
): Partial<Flight>[] {
  return flights.filter((f) => {
    if (filters.maxPrice !== undefined && Number(f.price) > filters.maxPrice) return false;
    if (filters.minPrice !== undefined && Number(f.price) < filters.minPrice) return false;
    if (filters.maxLayovers !== undefined) {
      const layoverCount = f.isLayover ? 1 : 0;
      if (layoverCount > filters.maxLayovers) return false;
    }
    if (filters.selectedAirlines && filters.selectedAirlines.length > 0 && !filters.selectedAirlines.includes(f.airline!)) return false;
    if (filters.maxDurationMinutes !== undefined && f.durationMinutes! > filters.maxDurationMinutes) return false;
    if (filters.departureTimeStart) {
      const dep = new Date(f.departureTime!).toTimeString().slice(0, 5);
      if (dep < filters.departureTimeStart) return false;
    }
    if (filters.departureTimeEnd) {
      const dep = new Date(f.departureTime!).toTimeString().slice(0, 5);
      if (dep > filters.departureTimeEnd) return false;
    }
    return true;
  });
}

const base: Partial<Flight> = {
  price: 300 as any,
  airline: 'Delta',
  isLayover: false,
  durationMinutes: 180,
  departureTime: new Date('2024-06-01T10:00:00') as any,
};

describe('price filter', () => {
  it('passes flight at exactly maxPrice', () => {
    expect(applyFilters([base], { maxPrice: 300 })).toHaveLength(1);
  });
  it('blocks flight above maxPrice', () => {
    expect(applyFilters([base], { maxPrice: 299 })).toHaveLength(0);
  });
  it('passes flight at exactly minPrice', () => {
    expect(applyFilters([base], { minPrice: 300 })).toHaveLength(1);
  });
  it('blocks flight below minPrice', () => {
    expect(applyFilters([base], { minPrice: 301 })).toHaveLength(0);
  });
});

describe('layover filter', () => {
  const direct = { ...base, isLayover: false };
  const layover = { ...base, isLayover: true };

  it('maxLayovers=0 allows direct, blocks layover', () => {
    expect(applyFilters([direct, layover], { maxLayovers: 0 })).toEqual([direct]);
  });
  it('maxLayovers=1 allows both', () => {
    expect(applyFilters([direct, layover], { maxLayovers: 1 })).toHaveLength(2);
  });
  it('no maxLayovers filter passes all', () => {
    expect(applyFilters([direct, layover], {})).toHaveLength(2);
  });
});

describe('airline filter', () => {
  const delta = { ...base, airline: 'Delta' };
  const united = { ...base, airline: 'United' };

  it('empty selectedAirlines passes all', () => {
    expect(applyFilters([delta, united], { selectedAirlines: [] })).toHaveLength(2);
  });
  it('filters to selected airline only', () => {
    expect(applyFilters([delta, united], { selectedAirlines: ['Delta'] })).toEqual([delta]);
  });
  it('multiple selected airlines pass through', () => {
    expect(applyFilters([delta, united], { selectedAirlines: ['Delta', 'United'] })).toHaveLength(2);
  });
});

describe('duration filter', () => {
  it('passes flight at exactly maxDuration', () => {
    expect(applyFilters([base], { maxDurationMinutes: 180 })).toHaveLength(1);
  });
  it('blocks flight exceeding maxDuration', () => {
    expect(applyFilters([base], { maxDurationMinutes: 179 })).toHaveLength(0);
  });
});

describe('departure time filter', () => {
  const morning = { ...base, departureTime: new Date('2024-06-01T08:00:00') as any };
  const noon = { ...base, departureTime: new Date('2024-06-01T12:00:00') as any };
  const evening = { ...base, departureTime: new Date('2024-06-01T19:00:00') as any };

  it('start filter excludes flights before start', () => {
    const result = applyFilters([morning, noon, evening], { departureTimeStart: '10:00' });
    expect(result).toEqual([noon, evening]);
  });
  it('end filter excludes flights after end', () => {
    const result = applyFilters([morning, noon, evening], { departureTimeEnd: '15:00' });
    expect(result).toEqual([morning, noon]);
  });
  it('start+end window keeps only flights inside', () => {
    const result = applyFilters([morning, noon, evening], { departureTimeStart: '10:00', departureTimeEnd: '15:00' });
    expect(result).toEqual([noon]);
  });
});
