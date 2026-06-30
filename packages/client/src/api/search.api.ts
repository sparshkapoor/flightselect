import apiClient from './client';
import type { SearchRequest, SearchResponse, SearchQuery, Flight, Comparison } from '@flightselect/shared';

export async function createSearch(data: SearchRequest): Promise<SearchResponse & { searchQueryId: string }> {
  const response = await apiClient.post<SearchResponse & { searchQueryId: string }>('/search', data);
  return response.data;
}

export type SearchQueryWithResults = SearchQuery & { flights: Flight[]; comparisons: Comparison[] };

export async function getSearch(id: string): Promise<SearchQueryWithResults> {
  const response = await apiClient.get(`/search/${id}`);
  return response.data.data;
}
