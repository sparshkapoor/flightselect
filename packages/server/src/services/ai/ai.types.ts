import { RecommendedOption } from '@flightselect/shared';

export interface AIAnalysisInput {
  comparisonId: string;
  roundTripTotalPrice: number;
  oneWayTotalPrice: number;
  priceDifference: number;
  roundTripFlightCount: number;
  oneWayFlightCount: number;
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  returnDate?: string;
  cabinClass: string;
  passengers: number;
}

export interface AIAnalysisOutput {
  summary: string;
  recommendation: RecommendedOption;
  confidenceScore: number; // 0-1
  reasoning: string[];
  warnings: string[];
  generatedAt: string;
}
