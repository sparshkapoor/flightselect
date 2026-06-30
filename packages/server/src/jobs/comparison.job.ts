import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';
import { RecommendedOption, TripType, expandAirportCodes } from '@flightselect/shared';
import { DbSearchQuery, DbFlight, DbSearchLeg } from '../types/db';

export interface ComparisonJobData {
  searchQueryId: string;
}

// Multi-city: cheapest flight per leg, summed. Simpler than the round-trip vs
// mix-and-match tradeoff above — there's no airline-bundling decision to make,
// each leg is independently the cheapest flight tagged to it.
async function processMultiCityComparison(searchQueryId: string, flights: DbFlight[]): Promise<void> {
  const legs = await query<DbSearchLeg>(
    'SELECT * FROM "SearchLeg" WHERE "searchQueryId" = $1 ORDER BY "legIndex" ASC',
    [searchQueryId]
  );
  if (legs.length === 0) {
    logger.warn(`No legs found for multi-city comparison: ${searchQueryId}`);
    return;
  }

  const legFlightIds: string[] = [];
  let total = 0;
  for (const leg of legs) {
    const legFlights = flights
      .filter((f) => f.searchLegId === leg.id)
      .sort((a, b) => Number(a.price) - Number(b.price));
    const cheapest = legFlights[0];
    if (!cheapest) {
      logger.warn(`No flights found for leg ${leg.legIndex} of ${searchQueryId} — skipping comparison`);
      return;
    }
    legFlightIds.push(cheapest.id);
    total += Number(cheapest.price);
  }

  await query(
    `INSERT INTO "Comparison" (
      id, "searchQueryId", "roundTripFlightIds", "oneWayOutboundFlightIds", "oneWayReturnFlightIds",
      "roundTripTotalPrice", "oneWayTotalPrice", "priceDifference", "recommendedOption",
      "aiAnalysis", "aiAnalysisGeneratedAt", "legFlightIds", "multiCityTotalPrice"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      crypto.randomUUID(), searchQueryId,
      [], [], [],
      null, null, null,
      RecommendedOption.MULTI_CITY, null, null,
      legFlightIds, total,
    ]
  );

  logger.info(`Multi-city comparison created for query: ${searchQueryId} (${legs.length} legs, total $${total})`);
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

  if (searchQuery.tripType === TripType.MULTI_CITY) {
    return processMultiCityComparison(searchQueryId, flights);
  }

  // Must recognize the same candidate airports search.job.ts actually scraped —
  // when includeNearbyAirports is on, flights can legitimately depart/arrive at
  // a nearby airport (e.g. EWR/LGA for a JFK search), not just the literal
  // requested originAirport/destinationAirport. Same expandAirportCodes used
  // there, so the two never disagree on what counts as "this search's route".
  const originCandidates = new Set(
    expandAirportCodes(searchQuery.originAirport, searchQuery.includeNearbyAirports, searchQuery.nearbyRadiusMiles)
  );
  const destinationCandidates = new Set(
    expandAirportCodes(searchQuery.destinationAirport, searchQuery.includeNearbyAirports, searchQuery.nearbyRadiusMiles)
  );

  const outboundFlights = flights
    .filter((f: DbFlight) => originCandidates.has(f.departureAirport) && destinationCandidates.has(f.arrivalAirport))
    .sort((a: DbFlight, b: DbFlight) => Number(a.price) - Number(b.price));

  const returnFlights = flights
    .filter((f: DbFlight) => destinationCandidates.has(f.departureAirport) && originCandidates.has(f.arrivalAirport))
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
        "aiAnalysis", "aiAnalysisGeneratedAt", "legFlightIds", "multiCityTotalPrice"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        crypto.randomUUID(), searchQueryId,
        [], [bestOutbound.id], [],
        null, oneWayPrice, null,
        RecommendedOption.ONE_WAY, null, null,
        [], null,
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
      "aiAnalysis", "aiAnalysisGeneratedAt", "legFlightIds", "multiCityTotalPrice", "sameAirlineAvailable"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      crypto.randomUUID(), searchQueryId,
      [bestSameAirlineOutbound.id, bestSameAirlineReturn.id],
      [bestOneWayOutbound.id],
      [bestOneWayReturn.id],
      roundTripPrice, oneWayPrice, priceDifference, recommendedOption,
      null, null,
      [], null, hasSameAirline,
    ]
  );

  logger.info(`Comparison created for query: ${searchQueryId} (${outboundFlights.length} outbound, ${returnFlights.length} return flights)`);
}
