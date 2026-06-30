import { query, queryOne } from '../config/database';
import { ScraperFactory } from '../scrapers/scraper.factory';
import { processComparisonJob } from './comparison.job';
import { logger } from '../utils/logger';
import { CabinClass, TripType, expandAirportCodes } from '@flightselect/shared';
import { DbSearchQuery, DbSearchLeg } from '../types/db';
import { env } from '../config/env';
import type { ScrapedFlight } from '../scrapers/scraper.interface';

// SerpAPI's google_flights departure_id/arrival_id accept comma-separated
// codes and return results merged in one call, each carrying its own real
// departure_airport/arrival_airport — so expansion is just building this
// string, no fan-out and no scraper changes required. comparison.job.ts and
// the client's splitFlightsByDirection must recognize the same candidate
// airports, so the expansion logic itself lives in @flightselect/shared.
function expandAirportCodesParam(code: string, includeNearby: boolean, radiusMiles: number | null): string {
  return expandAirportCodes(code, includeNearby, radiusMiles).join(',');
}

export interface SearchJobData {
  searchQueryId: string;
}

// Caps the stored flexibleDateRangeDays regardless of what was requested —
// each extra day multiplies live scraper calls (real API cost/quota), so this
// is a server-side sanity bound, not a UI-configurable limit.
const MAX_FLEXIBLE_RANGE_DAYS = 5;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

interface DatePair {
  departureDate: Date;
  returnDate: Date | undefined;
}

// Flexible dates vary departure and return independently, each holding the
// other fixed at its originally-requested date — O(4*rangeDays + 1) scraper
// calls instead of the full O((2*rangeDays+1)^2) departure x return grid.
// This finds "the cheapest day to leave" and "the cheapest day to return"
// separately; it won't find a combination where shifting both at once is
// cheaper than shifting either alone, which is an accepted tradeoff for cost.
function buildCandidateDatePairs(
  departureDate: Date,
  returnDate: Date | undefined,
  flexibleDates: boolean,
  flexibleDateRangeDays: number | null
): DatePair[] {
  if (!flexibleDates || !flexibleDateRangeDays) {
    return [{ departureDate, returnDate }];
  }

  const rangeDays = Math.min(flexibleDateRangeDays, MAX_FLEXIBLE_RANGE_DAYS);
  const seen = new Set<string>();
  const pairs: DatePair[] = [];

  const addPair = (dep: Date, ret: Date | undefined) => {
    const key = `${dep.toISOString()}|${ret?.toISOString() ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ departureDate: dep, returnDate: ret });
  };

  for (let offset = -rangeDays; offset <= rangeDays; offset++) {
    addPair(addDays(departureDate, offset), returnDate);
  }
  if (returnDate) {
    for (let offset = -rangeDays; offset <= rangeDays; offset++) {
      addPair(departureDate, addDays(returnDate, offset));
    }
  }

  return pairs;
}

export async function processSearchJob(data: SearchJobData): Promise<void> {
  const { searchQueryId } = data;

  logger.info(`Processing search job for query: ${searchQueryId}`);

  const searchQuery = await queryOne<DbSearchQuery>(
    'SELECT * FROM "SearchQuery" WHERE id = $1',
    [searchQueryId]
  );

  if (!searchQuery) {
    throw new Error(`SearchQuery not found: ${searchQueryId}`);
  }

  try {
    const scrapers = ScraperFactory.getAvailableScrapers();
    const isMultiCity = searchQuery.tripType === TripType.MULTI_CITY;

    // Each task is one scraper call; searchLegId tags which leg (multi-city) the
    // resulting flights belong to, or null for the normal one-way/round-trip flow.
    let tasks: { searchLegId: string | null; promise: Promise<ScrapedFlight[]> }[];

    if (isMultiCity) {
      const legs = await query<DbSearchLeg>(
        'SELECT * FROM "SearchLeg" WHERE "searchQueryId" = $1 ORDER BY "legIndex" ASC',
        [searchQueryId]
      );
      logger.info(`Search ${searchQueryId}: multi-city, ${legs.length} leg(s)`);
      tasks = scrapers.flatMap((scraper) =>
        legs.map((leg) => ({
          searchLegId: leg.id,
          promise: scraper.search({
            searchQueryId,
            originAirport: leg.originAirport,
            destinationAirport: leg.destinationAirport,
            departureDate: leg.departureDate,
            returnDate: undefined,
            passengers: searchQuery.passengers,
            cabinClass: searchQuery.cabinClass as CabinClass,
            maxLayovers: searchQuery.maxLayovers ?? undefined,
          }),
        }))
      );
    } else {
      const datePairs = buildCandidateDatePairs(
        searchQuery.departureDate,
        searchQuery.returnDate ?? undefined,
        searchQuery.flexibleDates,
        searchQuery.flexibleDateRangeDays
      );
      const expandedOrigin = expandAirportCodesParam(
        searchQuery.originAirport,
        searchQuery.includeNearbyAirports,
        searchQuery.nearbyRadiusMiles
      );
      const expandedDestination = expandAirportCodesParam(
        searchQuery.destinationAirport,
        searchQuery.includeNearbyAirports,
        searchQuery.nearbyRadiusMiles
      );
      logger.info(
        `Search ${searchQueryId}: ${datePairs.length} date pair(s)${searchQuery.flexibleDates ? ' (flexible dates)' : ''}` +
        (searchQuery.includeNearbyAirports ? ` (nearby: ${expandedOrigin} -> ${expandedDestination})` : '')
      );
      tasks = scrapers.flatMap((scraper) =>
        datePairs.map((pair) => ({
          searchLegId: null,
          promise: scraper.search({
            searchQueryId,
            originAirport: expandedOrigin,
            destinationAirport: expandedDestination,
            departureDate: pair.departureDate,
            returnDate: pair.returnDate,
            passengers: searchQuery.passengers,
            cabinClass: searchQuery.cabinClass as CabinClass,
            maxLayovers: searchQuery.maxLayovers ?? undefined,
          }),
        }))
      );
    }

    const settled = await Promise.allSettled(tasks.map((t) => t.promise));
    const scrapedFlights: { flight: ScrapedFlight; searchLegId: string | null }[] = [];
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        for (const flight of result.value) {
          scrapedFlights.push({ flight, searchLegId: tasks[i].searchLegId });
        }
      }
    });

    // Filtered here (not passed to the scraper) so it's guaranteed correct
    // regardless of whether the upstream API honors an exclude param.
    const avoidedAirlines = new Set(
      (searchQuery.avoidedAirlines ?? []).map((a) => a.toLowerCase())
    );
    const allFlights = avoidedAirlines.size
      ? scrapedFlights.filter(({ flight }) => !avoidedAirlines.has(flight.airline.toLowerCase()))
      : scrapedFlights;

    if (allFlights.length > 0) {
      await Promise.all(
        allFlights.map(({ flight: f, searchLegId }) =>
          query(
            `INSERT INTO "Flight" (
              id, "searchQueryId", airline, "flightNumber",
              "departureAirport", "arrivalAirport", "departureTime", "arrivalTime",
              "durationMinutes", price, currency, "cabinClass",
              "isLayover", "layoverAirport", "layoverDurationMinutes",
              source, "scrapedAt", "bookingUrl", "rawData", "searchLegId"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20
            )`,
            [
              crypto.randomUUID(),
              searchQueryId,
              f.airline,
              f.flightNumber,
              f.departureAirport,
              f.arrivalAirport,
              f.departureTime,
              f.arrivalTime,
              f.durationMinutes,
              f.price,
              f.currency,
              f.cabinClass,
              f.isLayover,
              f.layoverAirport ?? null,
              f.layoverDurationMinutes ?? null,
              f.source,
              f.scrapedAt,
              f.bookingUrl ?? null,
              f.rawData ?? null,
              searchLegId,
            ]
          )
        )
      );

      logger.info(`Saved ${allFlights.length} flights for query: ${searchQueryId}`);
    }

    try {
      await processComparisonJob({ searchQueryId });
      logger.info(`Comparison built for query: ${searchQueryId}`);
    } catch (err) {
      logger.error({ err }, 'Comparison processing error');
    }

    // Fire-and-forget: ingest flights into RAG vector store.
    // RAG being down must not fail the search job.
    if (allFlights.length > 0) {
      const ragPayload = {
        search_query_id: searchQueryId,
        flights: allFlights.map(({ flight: f }) => ({
          origin: f.departureAirport,
          destination: f.arrivalAirport,
          date: new Date(f.departureTime).toISOString().slice(0, 10),
          price: f.price,
          airline: f.airline,
          duration_minutes: f.durationMinutes,
        })),
      };
      const ragHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (env.RAG_INTERNAL_SECRET) ragHeaders['x-rag-secret'] = env.RAG_INTERNAL_SECRET;

      fetch(`${env.RAG_URL}/ingest`, {
        method: 'POST',
        headers: ragHeaders,
        body: JSON.stringify(ragPayload),
        signal: AbortSignal.timeout(10_000),
      })
        .then((res) => {
          if (!res.ok) logger.warn({ status: res.status }, 'RAG ingest returned non-ok');
          else logger.info(`RAG ingested ${allFlights.length} flights for query: ${searchQueryId}`);
        })
        .catch((err) => logger.warn({ err }, 'RAG ingest request failed (non-fatal)'));
    }

    await query(
      'UPDATE "SearchQuery" SET status = $1 WHERE id = $2',
      ['COMPLETED', searchQueryId]
    );
  } catch (err) {
    logger.error({ err }, `Search job failed for query: ${searchQueryId}`);
    await query(
      'UPDATE "SearchQuery" SET status = $1 WHERE id = $2',
      ['FAILED', searchQueryId]
    );
    throw err;
  }
}
