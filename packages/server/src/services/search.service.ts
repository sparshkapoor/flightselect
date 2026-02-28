import { prisma } from '../config/database';
import { searchQueue } from '../jobs/queue';
import { processSearchJob } from '../jobs/search.job';
import { SearchRequestInput } from '@flightselect/shared';
import { logger } from '../utils/logger';

export class SearchService {
  async createSearch(input: SearchRequestInput): Promise<{ searchQueryId: string }> {
    const searchQuery = await prisma.searchQuery.create({
      data: {
        originAirport: input.originAirport,
        destinationAirport: input.destinationAirport,
        departureDate: new Date(input.departureDate),
        returnDate: input.returnDate ? new Date(input.returnDate) : null,
        tripType: input.tripType,
        passengers: input.passengers ?? 1,
        cabinClass: input.cabinClass ?? 'ECONOMY',
        maxLayovers: input.maxLayovers ?? null,
        maxTotalDurationMinutes: input.maxTotalDurationMinutes ?? null,
        preferredLayoverAirports: input.preferredLayoverAirports ?? [],
        avoidedAirlines: input.avoidedAirlines ?? [],
        preferredAirlines: input.preferredAirlines ?? [],
        flexibleDates: input.flexibleDates ?? false,
        flexibleDateRangeDays: input.flexibleDateRangeDays ?? null,
        userId: input.userId ?? null,
      },
    });

    // Try to use Bull queue, fall back to direct processing
    try {
      await searchQueue.add('search', { searchQueryId: searchQuery.id });
      logger.info(`Queued search job for query: ${searchQuery.id}`);
    } catch (queueError) {
      logger.warn('Queue unavailable, processing search directly:', queueError);
      // Process synchronously if Redis is not available
      processSearchJob({ searchQueryId: searchQuery.id }).catch((err) =>
        logger.error('Direct search processing error:', err)
      );
    }

    return { searchQueryId: searchQuery.id };
  }

  async getSearch(searchQueryId: string) {
    return prisma.searchQuery.findUnique({
      where: { id: searchQueryId },
      include: {
        flights: { orderBy: { price: 'asc' } },
        comparisons: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }
}

export const searchService = new SearchService();
