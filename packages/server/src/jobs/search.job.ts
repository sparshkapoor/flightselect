import { query, queryOne } from '../config/database';
import { ScraperFactory } from '../scrapers/scraper.factory';
import { processComparisonJob } from './comparison.job';
import { logger } from '../utils/logger';
import { CabinClass } from '@flightselect/shared';
import { DbSearchQuery } from '../types/db';
import { env } from '../config/env';

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
    const datePairs = buildCandidateDatePairs(
      searchQuery.departureDate,
      searchQuery.returnDate ?? undefined,
      searchQuery.flexibleDates,
      searchQuery.flexibleDateRangeDays
    );
    logger.info(
      `Search ${searchQueryId}: ${datePairs.length} date pair(s)${searchQuery.flexibleDates ? ' (flexible dates)' : ''}`
    );

    const flightPromises = scrapers.flatMap((scraper) =>
      datePairs.map((pair) =>
        scraper.search({
          searchQueryId,
          originAirport: searchQuery.originAirport,
          destinationAirport: searchQuery.destinationAirport,
          departureDate: pair.departureDate,
          returnDate: pair.returnDate,
          passengers: searchQuery.passengers,
          cabinClass: searchQuery.cabinClass as CabinClass,
          maxLayovers: searchQuery.maxLayovers ?? undefined,
        })
      )
    );

    const results = await Promise.allSettled(flightPromises);
    const scrapedFlights = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof scrapers[0]['search']>>> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    // Filtered here (not passed to the scraper) so it's guaranteed correct
    // regardless of whether the upstream API honors an exclude param.
    const avoidedAirlines = new Set(
      (searchQuery.avoidedAirlines ?? []).map((a) => a.toLowerCase())
    );
    const allFlights = avoidedAirlines.size
      ? scrapedFlights.filter((f) => !avoidedAirlines.has(f.airline.toLowerCase()))
      : scrapedFlights;

    if (allFlights.length > 0) {
      await Promise.all(
        allFlights.map((f) =>
          query(
            `INSERT INTO "Flight" (
              id, "searchQueryId", airline, "flightNumber",
              "departureAirport", "arrivalAirport", "departureTime", "arrivalTime",
              "durationMinutes", price, currency, "cabinClass",
              "isLayover", "layoverAirport", "layoverDurationMinutes",
              source, "scrapedAt", "bookingUrl", "rawData"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19
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
        flights: allFlights.map((f) => ({
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
