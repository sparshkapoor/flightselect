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

  // Split flights into outbound (origin→dest) and return (dest→origin)
  const outboundFlights = flights
    .filter((f) => f.departureAirport === searchQuery.originAirport && f.arrivalAirport === searchQuery.destinationAirport)
    .sort((a, b) => Number(a.price) - Number(b.price));

  const returnFlights = flights
    .filter((f) => f.departureAirport === searchQuery.destinationAirport && f.arrivalAirport === searchQuery.originAirport)
    .sort((a, b) => Number(a.price) - Number(b.price));

  // If no return flights, we can't do a proper comparison
  if (returnFlights.length === 0) {
    logger.warn(`No return flights found for comparison: ${searchQueryId}`);
    // Still create a basic comparison with outbound only
    const bestOutbound = outboundFlights[0];
    if (!bestOutbound) return;

    const roundTripPrice = Number(bestOutbound.price) * 1.8;
    const oneWayPrice = Number(bestOutbound.price);

    await prisma.comparison.create({
      data: {
        searchQueryId,
        roundTripFlightIds: [bestOutbound.id],
        oneWayOutboundFlightIds: [bestOutbound.id],
        oneWayReturnFlightIds: [],
        roundTripTotalPrice: roundTripPrice,
        oneWayTotalPrice: oneWayPrice,
        priceDifference: roundTripPrice - oneWayPrice,
        recommendedOption: RecommendedOption.ONE_WAY,
        aiAnalysis: null,
        aiAnalysisGeneratedAt: null,
      },
    });
    return;
  }

  // Best round-trip: cheapest outbound + cheapest return on SAME airline (or cheapest combo)
  const bestRoundTripOutbound = outboundFlights[0];
  const bestRoundTripReturn = returnFlights.find((r) => r.airline === bestRoundTripOutbound.airline) ?? returnFlights[0];
  const roundTripPrice = (Number(bestRoundTripOutbound.price) + Number(bestRoundTripReturn.price)) * 0.9; // 10% RT discount

  // Best one-way combo: cheapest outbound + cheapest return (any airline)
  const bestOneWayOutbound = outboundFlights[0];
  const bestOneWayReturn = returnFlights[0];
  const oneWayPrice = Number(bestOneWayOutbound.price) + Number(bestOneWayReturn.price);

  const priceDifference = roundTripPrice - oneWayPrice;
  const recommendedOption =
    roundTripPrice <= oneWayPrice ? RecommendedOption.ROUND_TRIP : RecommendedOption.ONE_WAY;

  // Top outbound + return for round trip display
  const topRoundTripIds = [
    bestRoundTripOutbound.id,
    bestRoundTripReturn.id,
  ];

  // Generate AI analysis
  const aiAnalysis = await aiService.analyzeComparison({
    comparisonId: 'pending',
    roundTripTotalPrice: roundTripPrice,
    oneWayTotalPrice: oneWayPrice,
    priceDifference,
    roundTripFlightCount: 2,
    oneWayFlightCount: 2,
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
      roundTripFlightIds: topRoundTripIds,
      oneWayOutboundFlightIds: [bestOneWayOutbound.id],
      oneWayReturnFlightIds: [bestOneWayReturn.id],
      roundTripTotalPrice: roundTripPrice,
      oneWayTotalPrice: oneWayPrice,
      priceDifference,
      recommendedOption,
      aiAnalysis: JSON.stringify(aiAnalysis),
      aiAnalysisGeneratedAt: new Date(aiAnalysis.generatedAt),
    },
  });

  logger.info(`Comparison created for query: ${searchQueryId} (${outboundFlights.length} outbound, ${returnFlights.length} return flights)`);
}
