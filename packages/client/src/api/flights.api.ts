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

