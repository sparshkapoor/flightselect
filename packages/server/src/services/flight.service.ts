import { prisma } from '../config/database';

export class FlightService {
  async getFlights(searchQueryId?: string) {
    return prisma.flight.findMany({
      where: searchQueryId ? { searchQueryId } : undefined,
      orderBy: { price: 'asc' },
    });
  }

  async getFlightById(id: string) {
    return prisma.flight.findUnique({ where: { id } });
  }
}

export const flightService = new FlightService();
