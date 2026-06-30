import { query, queryOne } from '../config/database';
import { DbComparison, DbFlight } from '../types/db';

export class ComparisonService {
  async getComparison(id: string) {
    const comparison = await queryOne<DbComparison>(
      'SELECT * FROM "Comparison" WHERE id = $1',
      [id]
    );
    if (!comparison) return null;

    const [roundTripFlights, oneWayOutboundFlights, oneWayReturnFlights, legFlightsUnordered] = await Promise.all([
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.roundTripFlightIds]),
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.oneWayOutboundFlightIds]),
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.oneWayReturnFlightIds]),
      query<DbFlight>('SELECT * FROM "Flight" WHERE id = ANY($1)', [comparison.legFlightIds ?? []]),
    ]);

    // `id = ANY($1)` doesn't preserve input order — re-sort to match legFlightIds
    // (already legIndex-ordered), since leg presentation order matters to the client.
    const legOrder = comparison.legFlightIds ?? [];
    const legFlights = legOrder
      .map((id) => legFlightsUnordered.find((f) => f.id === id))
      .filter((f): f is DbFlight => Boolean(f));

    return { comparison, roundTripFlights, oneWayOutboundFlights, oneWayReturnFlights, legFlights };
  }

  async getComparisonsByQuery(searchQueryId: string) {
    return query<DbComparison>(
      'SELECT * FROM "Comparison" WHERE "searchQueryId" = $1 ORDER BY "createdAt" DESC',
      [searchQueryId]
    );
  }
}

export const comparisonService = new ComparisonService();
