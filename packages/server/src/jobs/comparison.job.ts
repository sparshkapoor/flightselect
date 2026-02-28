import { prisma } from '../config/database';
import { MockAIService } from '../services/ai/ai.service';
import { logger } from '../utils/logger';
import { RecommendedOption } from '@flightselect/shared';

export interface ComparisonJobData {
  searchQueryId: string;
}

const aiService = new MockAIService();

export async function processComparisonJob(data: ComparisonJobData): Promise<void> {
  const { searchQueryId } = data;

  logger.info(`Building comparison for query: ${searchQueryId}`);

  const [searchQuery, flights] = await Promise.all([
    prisma.searchQuery.findUnique({ where: { id: searchQueryId } }),
    prisma.flight.findMany({ where: { searchQueryId } }),
  ]);

  if (!searchQuery || flights.length === 0) {
    logger.warn(`No data found for comparison: ${searchQueryId}`);
    return;
  }

  // Sort flights by price for best options
  const sortedFlights = [...flights].sort((a, b) => Number(a.price) - Number(b.price));
  const directFlights = sortedFlights.filter((f) => !f.isLayover);
  const allFlights = directFlights.length > 0 ? directFlights : sortedFlights;

  // Best round-trip: cheapest outbound + return combined
  const outboundFlights = allFlights.slice(0, Math.min(3, allFlights.length));
  const returnFlights = allFlights.slice(0, Math.min(3, allFlights.length));

  const bestRoundTrip = outboundFlights[0];
  const roundTripPrice = bestRoundTrip ? Number(bestRoundTrip.price) * 1.8 : 0; // RT pricing heuristic

  // Best one-way combo: cheapest outbound + cheapest return (potentially different airlines)
  const bestOutbound = outboundFlights[0];
  const bestReturn = returnFlights[Math.min(1, returnFlights.length - 1)] ?? returnFlights[0];
  const oneWayPrice = bestOutbound && bestReturn
    ? Number(bestOutbound.price) + Number(bestReturn.price)
    : 0;

  const priceDifference = roundTripPrice - oneWayPrice;
  const recommendedOption =
    roundTripPrice <= oneWayPrice ? RecommendedOption.ROUND_TRIP : RecommendedOption.ONE_WAY;

  // Generate AI analysis
  const aiAnalysis = await aiService.analyzeComparison({
    comparisonId: 'pending',
    roundTripTotalPrice: roundTripPrice,
    oneWayTotalPrice: oneWayPrice,
    priceDifference,
    roundTripFlightCount: outboundFlights.length,
    oneWayFlightCount: outboundFlights.length + returnFlights.length,
    originAirport: searchQuery.originAirport,
    destinationAirport: searchQuery.destinationAirport,
    departureDate: searchQuery.departureDate.toISOString(),
    returnDate: searchQuery.returnDate?.toISOString(),
    cabinClass: searchQuery.cabinClass,
    passengers: searchQuery.passengers,
  });

  await prisma.comparison.create({
    data: {
      searchQueryId,
      roundTripFlightIds: outboundFlights.map((f) => f.id),
      oneWayOutboundFlightIds: bestOutbound ? [bestOutbound.id] : [],
      oneWayReturnFlightIds: bestReturn ? [bestReturn.id] : [],
      roundTripTotalPrice: roundTripPrice,
      oneWayTotalPrice: oneWayPrice,
      priceDifference,
      recommendedOption,
      aiAnalysis: JSON.stringify(aiAnalysis),
      aiAnalysisGeneratedAt: new Date(aiAnalysis.generatedAt),
    },
  });

  logger.info(`Comparison created for query: ${searchQueryId}`);
}
