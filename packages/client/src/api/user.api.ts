import apiClient from './client';

export async function createUser(data: { email: string; displayName?: string }) {
  const response = await apiClient.post('/users', data);
  return response.data.data;
}

export async function getUser(id: string) {
  const response = await apiClient.get(`/users/${id}`);
  return response.data.data;
}
