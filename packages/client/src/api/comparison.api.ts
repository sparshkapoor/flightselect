import apiClient from './client';
import type { ComparisonResponse, Comparison } from '@flightselect/shared';

export async function getComparison(id: string): Promise<ComparisonResponse> {
  const response = await apiClient.get(`/comparison/${id}`);
  return response.data.data;
}

export async function getComparisonsByQuery(searchQueryId: string): Promise<Comparison[]> {
  const response = await apiClient.get('/comparison', { params: { searchQueryId } });
  return response.data.data;
}
