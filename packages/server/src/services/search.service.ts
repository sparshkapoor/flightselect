import { query, queryOne } from '../config/database';
import { searchQueue } from '../jobs/queue';
import { processSearchJob } from '../jobs/search.job';
import { SearchRequestInput } from '@flightselect/shared';
import { logger } from '../utils/logger';
import { DbSearchQuery, DbFlight, DbComparison } from '../types/db';

export class SearchService {
  async createSearch(input: SearchRequestInput): Promise<{ searchQueryId: string }> {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO "SearchQuery" (
        id, "originAirport", "destinationAirport", "departureDate", "returnDate",
        "tripType", passengers, "cabinClass", "maxLayovers", "maxTotalDurationMinutes",
        "preferredLayoverAirports", "avoidedAirlines", "preferredAirlines",
        "flexibleDates", "flexibleDateRangeDays", "userId"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        input.originAirport,
        input.destinationAirport,
        new Date(input.departureDate),
        input.returnDate ? new Date(input.returnDate) : null,
        input.tripType,
        input.passengers ?? 1,
        input.cabinClass ?? 'ECONOMY',
        input.maxLayovers ?? null,
        input.maxTotalDurationMinutes ?? null,
        input.preferredLayoverAirports ?? [],
        input.avoidedAirlines ?? [],
        input.preferredAirlines ?? [],
        input.flexibleDates ?? false,
        input.flexibleDateRangeDays ?? null,
        input.userId ?? null,
      ]
    );

    try {
      await searchQueue.add('search', { searchQueryId: id });
      logger.info(`Queued search job for query: ${id}`);
    } catch (queueError) {
      logger.warn({ err: queueError }, 'Queue unavailable, processing search directly');
      processSearchJob({ searchQueryId: id }).catch((err) =>
        logger.error({ err }, 'Direct search processing error')
      );
    }

    return { searchQueryId: id };
  }

  async getSearch(searchQueryId: string) {
    const searchQuery = await queryOne<DbSearchQuery>(
      'SELECT * FROM "SearchQuery" WHERE id = $1',
      [searchQueryId]
    );
    if (!searchQuery) return null;

    const [flights, comparisons] = await Promise.all([
      query<DbFlight>(
        'SELECT * FROM "Flight" WHERE "searchQueryId" = $1 ORDER BY price ASC',
        [searchQueryId]
      ),
      query<DbComparison>(
        'SELECT * FROM "Comparison" WHERE "searchQueryId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [searchQueryId]
      ),
    ]);

    return { ...searchQuery, flights, comparisons };
  }
}

export const searchService = new SearchService();
