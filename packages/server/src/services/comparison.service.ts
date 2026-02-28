import { prisma } from '../config/database';

export class ComparisonService {
  async getComparison(id: string) {
    const comparison = await prisma.comparison.findUnique({ where: { id } });
    if (!comparison) return null;

    const [roundTripFlights, oneWayOutboundFlights, oneWayReturnFlights] = await Promise.all([
      prisma.flight.findMany({ where: { id: { in: comparison.roundTripFlightIds } } }),
      prisma.flight.findMany({ where: { id: { in: comparison.oneWayOutboundFlightIds } } }),
      prisma.flight.findMany({ where: { id: { in: comparison.oneWayReturnFlightIds } } }),
    ]);

    return { comparison, roundTripFlights, oneWayOutboundFlights, oneWayReturnFlights };
  }

  async getComparisonsByQuery(searchQueryId: string) {
    return prisma.comparison.findMany({
      where: { searchQueryId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const comparisonService = new ComparisonService();
