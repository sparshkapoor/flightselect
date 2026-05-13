import { logger } from '../utils/logger';

const RAG_BASE_URL = process.env.RAG_URL ?? 'http://localhost:8000';

interface RagAnswer {
  answer: string;
}

export async function queryRag(
  question: string,
  nResults = 5,
  mode: 'general' | 'comparison' = 'general'
): Promise<string | null> {
  try {
    const res = await fetch(`${RAG_BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, n_results: nResults, mode }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'RAG service returned non-200');
      return null;
    }

    const data = (await res.json()) as RagAnswer;
    return data.answer;
  } catch (err) {
    logger.warn({ err }, 'RAG service unreachable');
    return null;
  }
}
