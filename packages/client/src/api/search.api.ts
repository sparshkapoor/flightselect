import apiClient from './client';
import type { SearchRequest, SearchResponse } from '@flightselect/shared';

export async function createSearch(data: SearchRequest): Promise<SearchResponse & { searchQueryId: string }> {
  const response = await apiClient.post<SearchResponse & { searchQueryId: string }>('/search', data);
  return response.data;
}

export async function getSearch(id: string) {
  const response = await apiClient.get(`/search/${id}`);
  return response.data.data;
}
