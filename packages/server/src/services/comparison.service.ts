import { query, queryOne } from '../config/database';
import { DbComparison, DbFlight } from '../types/db';

export class ComparisonService {
  async getComparison(id: string) {
    const comparison = await queryOne<DbComparison>(
      'SELECT * FROM "Comparison" WHERE id = $1',
      [id]
    );
    if (!comparison) return null;

    const [roundTripFlights, oneWayOutboundFlights, oneWayReturnFlights] = await Promise.all([
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.roundTripFlightIds]),
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.oneWayOutboundFlightIds]),
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.oneWayReturnFlightIds]),
    ]);

    return { comparison, roundTripFlights, oneWayOutboundFlights, oneWayReturnFlights };
  }

  async getComparisonsByQuery(searchQueryId: string) {
    return query<DbComparison>(
      'SELECT * FROM "Comparison" WHERE "searchQueryId" = $1 ORDER BY "createdAt" DESC',
      [searchQueryId]
    );
  }
}

export const comparisonService = new ComparisonService();
