import { prisma } from '../config/database';
import { ScraperFactory } from '../scrapers/scraper.factory';
import { processComparisonJob } from './comparison.job';
import { logger } from '../utils/logger';
import { CabinClass } from '@flightselect/shared';

export interface SearchJobData {
  searchQueryId: string;
}

export async function processSearchJob(data: SearchJobData): Promise<void> {
  const { searchQueryId } = data;

  logger.info(`Processing search job for query: ${searchQueryId}`);

  const searchQuery = await prisma.searchQuery.findUnique({
    where: { id: searchQueryId },
  });

  if (!searchQuery) {
    throw new Error(`SearchQuery not found: ${searchQueryId}`);
  }

  const scrapers = ScraperFactory.getAvailableScrapers();
  const flightPromises = scrapers.map((scraper) =>
    scraper.search({
      searchQueryId,
      originAirport: searchQuery.originAirport,
      destinationAirport: searchQuery.destinationAirport,
      departureDate: searchQuery.departureDate,
      returnDate: searchQuery.returnDate ?? undefined,
      passengers: searchQuery.passengers,
      cabinClass: searchQuery.cabinClass as CabinClass,
      maxLayovers: searchQuery.maxLayovers ?? undefined,
    })
  );

  const results = await Promise.allSettled(flightPromises);
  const allFlights = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof scrapers[0]['search']>>> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  if (allFlights.length > 0) {
    await prisma.flight.createMany({
      data: allFlights.map((f) => ({
        searchQueryId,
        airline: f.airline,
        flightNumber: f.flightNumber,
        departureAirport: f.departureAirport,
        arrivalAirport: f.arrivalAirport,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        durationMinutes: f.durationMinutes,
        price: f.price,
        currency: f.currency,
        cabinClass: f.cabinClass,
        isLayover: f.isLayover,
        layoverAirport: f.layoverAirport,
        layoverDurationMinutes: f.layoverDurationMinutes,
        source: f.source,
        scrapedAt: f.scrapedAt,
        rawData: f.rawData ?? undefined,
      })),
    });

    logger.info(`Saved ${allFlights.length} flights for query: ${searchQueryId}`);
  }

  // Process comparison directly (no queue needed — it's fast)
  try {
    await processComparisonJob({ searchQueryId });
    logger.info(`Comparison built for query: ${searchQueryId}`);
  } catch (err) {
    logger.error({ err }, 'Comparison processing error');
  }
}
