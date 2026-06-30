import apiClient from './client';
import type { Flight } from '@flightselect/shared';

export async function getFlights(searchQueryId?: string): Promise<{ flights: Flight[]; total: number }> {
  const params = searchQueryId ? { searchQueryId } : {};
  const response = await apiClient.get('/flights', { params });
  return { flights: response.data.data, total: response.data.total };
}

export async function getRoundTripBookingUrl(outboundId: string, returnId: string): Promise<string | null> {
  const response = await apiClient.get('/flights/round-trip-booking-url', {
    params: { outboundId, returnId },
  });
  return response.data.data.url;
}

/** flightIds must be in leg order (legIndex 0..N-1) — order determines the tfs leg order. */
export async function getMultiCityBookingUrl(flightIds: string[]): Promise<string | null> {
  const response = await apiClient.get('/flights/multi-city-booking-url', {
    params: { flightIds: flightIds.join(',') },
  });
  return response.data.data.url;
}

