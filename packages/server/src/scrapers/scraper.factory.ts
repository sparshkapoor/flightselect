import { IScraper } from './scraper.interface';
import { MockScraper } from './mock.scraper';
import { googleFlightsScraper } from './google-flights';

/**
 * ScraperFactory creates scraper instances by source name.
 * Add new scrapers here as they are implemented.
 */
export class ScraperFactory {
  private static scrapers: Map<string, IScraper> = new Map([
    ['mock', new MockScraper()],
    ['google-flights', googleFlightsScraper],
  ]);

  static getScraper(source: string): IScraper {
    const scraper = ScraperFactory.scrapers.get(source);
    if (!scraper) {
      throw new Error(`Scraper not found for source: ${source}`);
    }
    return scraper;
  }

  static getAvailableScrapers(): IScraper[] {
    const available = Array.from(ScraperFactory.scrapers.values()).filter((s) => s.isAvailable());
    // If real scrapers are available, skip mock data
    const realScrapers = available.filter((s) => s.source !== 'mock');
    return realScrapers.length > 0 ? realScrapers : available;
  }

  static registerScraper(scraper: IScraper): void {
    ScraperFactory.scrapers.set(scraper.source, scraper);
  }
  
}
