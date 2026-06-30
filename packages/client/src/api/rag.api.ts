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

export interface KnowledgeInsight {
  answer: string;
  asOf: string;
  stale: boolean;
}

export async function queryKnowledge(
  itinerarySummary: string,
  airlines: string[] = []
): Promise<KnowledgeInsight | null> {
  try {
    const { data } = await apiClient.post<{ status: string; answer: string; asOf: string; stale: boolean }>(
      '/rag/knowledge',
      { itinerarySummary, airlines }
    );
    const answer = data.answer?.trim();
    if (!answer || answer.toLowerCase() === 'insufficient data') return null;
    return { answer, asOf: data.asOf, stale: data.stale };
  } catch {
    return null;
  }
}
