import apiClient from './client';

export async function queryRag(
  question: string,
  mode: 'general' | 'comparison' = 'general',
  origin?: string,
  destination?: string
): Promise<string | null> {
  try {
    const { data } = await apiClient.post<{ status: string; answer: string }>('/rag/query', {
      question,
      mode,
      nResults: 5,
      origin,
      destination,
    });
    const answer = data.answer?.trim();
    if (!answer || answer.toLowerCase() === 'insufficient data') return null;
    return answer;
  } catch {
    return null;
  }
}
