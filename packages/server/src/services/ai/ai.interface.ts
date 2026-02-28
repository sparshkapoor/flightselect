import { AIAnalysisInput, AIAnalysisOutput } from './ai.types';

/**
 * IAIService defines the contract for AI-powered flight comparison analysis.
 *
 * To swap the mock implementation for a real LLM:
 * 1. Create a new class implementing this interface (e.g., ClaudeAIService, OpenAIService)
 * 2. Update the dependency injection in the service container / route setup
 * 3. The real implementation should call the LLM with a structured prompt built
 *    from the AIAnalysisInput and parse the response into AIAnalysisOutput
 *
 * Suggested models:
 * - Anthropic Claude 3 Opus / Sonnet (claude-3-opus-20240229)
 * - OpenAI GPT-4o (gpt-4o)
 * - Open-source: Mixtral 8x7B via Together.ai or Groq
 */
export interface IAIService {
  /**
   * Analyze a flight comparison and return AI-generated insights.
   * @param input - Structured comparison data
   * @returns AI-generated analysis and recommendation
   */
  analyzeComparison(input: AIAnalysisInput): Promise<AIAnalysisOutput>;

  /**
   * Answer a follow-up question about a specific comparison.
   * @param comparisonId - ID of the comparison
   * @param question - User's natural language question
   * @returns AI-generated answer
   */
  answerFollowUp(comparisonId: string, question: string): Promise<string>;
}
