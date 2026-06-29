import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';
import { RecommendedOption } from '@flightselect/shared';
import { DbSearchQuery, DbFlight } from '../types/db';

export interface ComparisonJobData {
  searchQueryId: string;
}

export async function processComparisonJob(data: ComparisonJobData): Promise<void> {
  const { searchQueryId } = data;

  logger.info(`Building comparison for query: ${searchQueryId}`);

  const [searchQuery, flights] = await Promise.all([
    queryOne<DbSearchQuery>('SELECT * FROM "SearchQuery" WHERE id = $1', [searchQueryId]),
    query<DbFlight>('SELECT * FROM "Flight" WHERE "searchQueryId" = $1', [searchQueryId]),
  ]);

  if (!searchQuery || flights.length === 0) {
    logger.warn(`No data found for comparison: ${searchQueryId}`);
    return;
  }

  const outboundFlights = flights
    .filter((f: DbFlight) => f.departureAirport === searchQuery.originAirport && f.arrivalAirport === searchQuery.destinationAirport)
    .sort((a: DbFlight, b: DbFlight) => Number(a.price) - Number(b.price));

  const returnFlights = flights
    .filter((f: DbFlight) => f.departureAirport === searchQuery.destinationAirport && f.arrivalAirport === searchQuery.originAirport)
    .sort((a: DbFlight, b: DbFlight) => Number(a.price) - Number(b.price));

  if (returnFlights.length === 0) {
    logger.warn(`No return flights found for comparison: ${searchQueryId}`);
    const bestOutbound = outboundFlights[0];
    if (!bestOutbound) return;

    // No return leg exists, so there's no real round-trip price to report —
    // store null rather than inventing one. Only a one-way price is honest here.
    const oneWayPrice = Number(bestOutbound.price);

    await query(
      `INSERT INTO "Comparison" (
        id, "searchQueryId", "roundTripFlightIds", "oneWayOutboundFlightIds", "oneWayReturnFlightIds",
        "roundTripTotalPrice", "oneWayTotalPrice", "priceDifference", "recommendedOption",
        "aiAnalysis", "aiAnalysisGeneratedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(), searchQueryId,
        [], [bestOutbound.id], [],
        null, oneWayPrice, null,
        RecommendedOption.ONE_WAY, null, null,
      ]
    );
    return;
  }

  let bestSameAirlineOutbound = outboundFlights[0];
  let bestSameAirlineReturn = returnFlights[0];
  let bestSameAirlinePrice = Infinity;

  for (const out of outboundFlights) {
    const matchingReturn = returnFlights.find((r: DbFlight) => r.airline === out.airline);
    if (matchingReturn) {
      const combo = Number(out.price) + Number(matchingReturn.price);
      if (combo < bestSameAirlinePrice) {
        bestSameAirlinePrice = combo;
        bestSameAirlineOutbound = out;
        bestSameAirlineReturn = matchingReturn;
      }
    }
  }

  const hasSameAirline = bestSameAirlinePrice < Infinity;
  if (!hasSameAirline) {
    bestSameAirlinePrice = Number(outboundFlights[0].price) + Number(returnFlights[0].price);
    bestSameAirlineOutbound = outboundFlights[0];
    bestSameAirlineReturn = returnFlights[0];
  }

  const roundTripPrice = bestSameAirlinePrice;
  const bestOneWayOutbound = outboundFlights[0];
  const bestOneWayReturn = returnFlights[0];
  const oneWayPrice = Number(bestOneWayOutbound.price) + Number(bestOneWayReturn.price);
  const priceDifference = roundTripPrice - oneWayPrice;
  const recommendedOption =
    roundTripPrice <= oneWayPrice ? RecommendedOption.ROUND_TRIP : RecommendedOption.ONE_WAY;

  await query(
    `INSERT INTO "Comparison" (
      id, "searchQueryId", "roundTripFlightIds", "oneWayOutboundFlightIds", "oneWayReturnFlightIds",
      "roundTripTotalPrice", "oneWayTotalPrice", "priceDifference", "recommendedOption",
      "aiAnalysis", "aiAnalysisGeneratedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      crypto.randomUUID(), searchQueryId,
      [bestSameAirlineOutbound.id, bestSameAirlineReturn.id],
      [bestOneWayOutbound.id],
      [bestOneWayReturn.id],
      roundTripPrice, oneWayPrice, priceDifference, recommendedOption,
      null, null,
    ]
  );

  logger.info(`Comparison created for query: ${searchQueryId} (${outboundFlights.length} outbound, ${returnFlights.length} return flights)`);
}
