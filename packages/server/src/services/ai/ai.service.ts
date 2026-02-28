import { RecommendedOption } from '@flightselect/shared';
import { IAIService } from './ai.interface';
import { AIAnalysisInput, AIAnalysisOutput } from './ai.types';

/**
 * MockAIService — placeholder implementation of IAIService.
 *
 * This returns realistic-looking mock responses without making any real API calls.
 * Replace this with a real LLM-backed implementation when ready.
 *
 * See ai.interface.ts for instructions on swapping implementations.
 */
export class MockAIService implements IAIService {
  async analyzeComparison(input: AIAnalysisInput): Promise<AIAnalysisOutput> {
    // Simulate network/processing delay
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

    const savings = Math.abs(input.priceDifference);
    const cheaperOption =
      input.roundTripTotalPrice <= input.oneWayTotalPrice
        ? RecommendedOption.ROUND_TRIP
        : RecommendedOption.ONE_WAY;

    const savingsPercent = ((savings / Math.max(input.roundTripTotalPrice, input.oneWayTotalPrice)) * 100).toFixed(1);

    const reasoning: string[] = [];
    const warnings: string[] = [];

    if (cheaperOption === RecommendedOption.ROUND_TRIP) {
      reasoning.push(
        `Round-trip booking saves $${savings.toFixed(0)} (${savingsPercent}%) compared to two separate one-way tickets.`
      );
      reasoning.push('Airlines typically offer discounted round-trip fares to encourage commitment.');
      reasoning.push('A single booking simplifies itinerary management and check-in.');
    } else {
      reasoning.push(
        `Two separate one-way tickets save $${savings.toFixed(0)} (${savingsPercent}%) compared to round-trip pricing.`
      );
      reasoning.push('Mixing airlines can unlock better pricing on each leg independently.');
      reasoning.push(
        'One-way flexibility allows rescheduling each leg independently if plans change.'
      );
      warnings.push(
        'Separate bookings mean separate check-ins and no automatic rebooking if one flight is disrupted.'
      );
    }

    if (input.passengers > 1) {
      reasoning.push(
        `With ${input.passengers} passengers, the total difference is $${(savings * input.passengers).toFixed(0)}.`
      );
    }

    if (input.cabinClass !== 'ECONOMY') {
      warnings.push(`${input.cabinClass} cabin class pricing may vary significantly by airline — verify directly.`);
    }

    const summary =
      cheaperOption === RecommendedOption.ROUND_TRIP
        ? `For your ${input.originAirport}→${input.destinationAirport} trip, booking round-trip is the better value at $${input.roundTripTotalPrice.toFixed(0)} total vs. $${input.oneWayTotalPrice.toFixed(0)} for separate one-way tickets.`
        : `For your ${input.originAirport}→${input.destinationAirport} trip, two separate one-way tickets total $${input.oneWayTotalPrice.toFixed(0)}, beating the round-trip price of $${input.roundTripTotalPrice.toFixed(0)}.`;

    return {
      summary,
      recommendation: cheaperOption,
      confidenceScore: 0.75 + Math.random() * 0.2,
      reasoning,
      warnings,
      generatedAt: new Date().toISOString(),
    };
  }

  async answerFollowUp(_comparisonId: string, question: string): Promise<string> {
    // TODO: Replace with real LLM call
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 200));
    return `[AI Placeholder] You asked: "${question}". Real AI analysis coming soon — this feature will use an LLM to answer questions about your specific flight comparison in natural language.`;
  }
}
