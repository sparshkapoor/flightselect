import { query, queryOne } from '../config/database';
import { DbFlight } from '../types/db';
import { deriveBookingUrl } from '../utils/googleFlightsUrl';

function withBookingUrl(flight: DbFlight): DbFlight {
  return {
    ...flight,
    bookingUrl: deriveBookingUrl(
      flight.flightNumber,
      flight.departureAirport,
      flight.arrivalAirport,
      new Date(flight.departureTime),
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
}

export const flightService = new FlightService();
