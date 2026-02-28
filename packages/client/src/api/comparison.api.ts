import apiClient from './client';

export async function getComparison(id: string) {
  const response = await apiClient.get(`/comparison/${id}`);
  return response.data.data;
}

export async function getComparisonsByQuery(searchQueryId: string) {
  const response = await apiClient.get('/comparison', { params: { searchQueryId } });
  return response.data.data;
}
