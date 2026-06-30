import { query, queryOne } from '../config/database';
import { DbFlight } from '../types/db';
import { deriveBookingUrl, deriveRoundTripBookingUrl, deriveMultiCityBookingUrl } from '../utils/googleFlightsUrl';

function withBookingUrl(flight: DbFlight): DbFlight {
  return {
    ...flight,
    bookingUrl: deriveBookingUrl(
      flight.flightNumber,
      flight.departureAirport,
      flight.arrivalAirport,
      new Date(flight.departureTime),
      flight.isLayover,
      flight.rawData,
    ),
  };
}

export class FlightService {
  async getFlights(searchQueryId?: string) {
    const rows = searchQueryId
      ? await query<DbFlight>(
          'SELECT * FROM "Flight" WHERE "searchQueryId" = $1 ORDER BY price ASC',
          [searchQueryId]
        )
      : await query<DbFlight>('SELECT * FROM "Flight" ORDER BY price ASC');
    return rows.map(withBookingUrl);
  }

  async getFlightById(id: string) {
    const flight = await queryOne<DbFlight>('SELECT * FROM "Flight" WHERE id = $1', [id]);
    return flight ? withBookingUrl(flight) : null;
  }

  async getRoundTripBookingUrl(outboundId: string, returnId: string): Promise<string | null> {
    const [outbound, ret] = await Promise.all([
      queryOne<DbFlight>('SELECT * FROM "Flight" WHERE id = $1', [outboundId]),
      queryOne<DbFlight>('SELECT * FROM "Flight" WHERE id = $1', [returnId]),
    ]);
    if (!outbound || !ret) return null;
    return deriveRoundTripBookingUrl(outbound, ret);
  }

  async getMultiCityBookingUrl(flightIds: string[]): Promise<string | null> {
    const flights = await Promise.all(
      flightIds.map((id) => queryOne<DbFlight>('SELECT * FROM "Flight" WHERE id = $1', [id]))
    );
    if (flights.some((f) => !f)) return null;
    return deriveMultiCityBookingUrl(flights as DbFlight[]);
  }
}

export const flightService = new FlightService();
