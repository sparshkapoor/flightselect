import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '../stores/filterStore';

beforeEach(() => {
  useFilterStore.getState().reset();
});

describe('filterStore', () => {
  it('starts with all fields undefined/empty', () => {
    const s = useFilterStore.getState();
    expect(s.maxPrice).toBeUndefined();
    expect(s.minPrice).toBeUndefined();
    expect(s.maxDurationMinutes).toBeUndefined();
    expect(s.maxLayovers).toBeUndefined();
    expect(s.selectedAirlines).toEqual([]);
    expect(s.departureTimeStart).toBeUndefined();
    expect(s.departureTimeEnd).toBeUndefined();
  });

  it('setMaxPrice / setMinPrice round-trip', () => {
    useFilterStore.getState().setMaxPrice(500);
    useFilterStore.getState().setMinPrice(100);
    expect(useFilterStore.getState().maxPrice).toBe(500);
    expect(useFilterStore.getState().minPrice).toBe(100);
  });

  it('reset clears maxPrice and minPrice', () => {
    useFilterStore.getState().setMaxPrice(300);
    useFilterStore.getState().reset();
    expect(useFilterStore.getState().maxPrice).toBeUndefined();
    expect(useFilterStore.getState().minPrice).toBeUndefined();
  });

  it('selectedAirlines add and remove', () => {
    const s = useFilterStore.getState();
    s.setSelectedAirlines(['Delta', 'United']);
    expect(useFilterStore.getState().selectedAirlines).toEqual(['Delta', 'United']);
    s.setSelectedAirlines(['Delta']);
    expect(useFilterStore.getState().selectedAirlines).toEqual(['Delta']);
  });

  it('reset returns selectedAirlines to []', () => {
    useFilterStore.getState().setSelectedAirlines(['Delta']);
    useFilterStore.getState().reset();
    expect(useFilterStore.getState().selectedAirlines).toEqual([]);
  });

  it('setMaxLayovers stores value and reset clears it', () => {
    useFilterStore.getState().setMaxLayovers(1);
    expect(useFilterStore.getState().maxLayovers).toBe(1);
    useFilterStore.getState().reset();
    expect(useFilterStore.getState().maxLayovers).toBeUndefined();
  });
});
