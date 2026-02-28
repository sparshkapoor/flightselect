import apiClient from './client';
import type { Flight } from '@flightselect/shared';

export async function getFlights(searchQueryId?: string): Promise<{ flights: Flight[]; total: number }> {
  const params = searchQueryId ? { searchQueryId } : {};
  const response = await apiClient.get('/flights', { params });
  return { flights: response.data.data, total: response.data.total };
}

export async function getFlightById(id: string): Promise<Flight> {
  const response = await apiClient.get(`/flights/${id}`);
  return response.data.data;
}
