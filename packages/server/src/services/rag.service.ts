import { logger } from '../utils/logger';
import { env } from '../config/env';

const RAG_BASE_URL = env.RAG_URL;

interface RagAnswer {
  answer: string;
}

export async function queryRag(
  question: string,
  nResults = 5,
  mode: 'general' | 'comparison' = 'general',
  origin?: string,
  destination?: string
): Promise<string | null> {
  try {
    const res = await fetch(`${RAG_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.RAG_INTERNAL_SECRET ? { 'X-RAG-Secret': env.RAG_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({ question, n_results: nResults, mode, origin, destination }),
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
    const res = await fetch(`${RAG_BASE_URL}/knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.RAG_INTERNAL_SECRET ? { 'X-RAG-Secret': env.RAG_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({ itinerary_summary: itinerarySummary, airlines }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'RAG knowledge returned non-200');
      return null;
    }

    const data = (await res.json()) as { answer: string; as_of: string; stale: boolean };
    return { answer: data.answer, asOf: data.as_of, stale: data.stale };
  } catch (err) {
    logger.warn({ err }, 'RAG knowledge service unreachable');
    return null;
  }
}
