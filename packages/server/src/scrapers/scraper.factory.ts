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
  ]);

  static getScraper(source: string): IScraper {
    const scraper = ScraperFactory.scrapers.get(source);
    if (!scraper) {
      throw new Error(`Scraper not found for source: ${source}`);
    }
    return scraper;
  }

  static getAvailableScrapers(): IScraper[] {
    return Array.from(ScraperFactory.scrapers.values()).filter((s) => s.isAvailable());
  }

  static registerScraper(scraper: IScraper): void {
    ScraperFactory.scrapers.set(scraper.source, scraper);
  }
  
  export const scrapers = {
    googleFlights: googleFlightsScraper,
  };

}
