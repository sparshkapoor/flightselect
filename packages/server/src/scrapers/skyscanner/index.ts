import { IScraper, ScraperSearchParams, ScrapedFlight } from '../scraper.interface';

/**
 * Skyscanner scraper — NOT YET IMPLEMENTED
 *
 * Skyscanner has a partner API available through their affiliate program:
 * https://skyscanner.github.io/slate/
 *
 * Implementation options:
 * - Apply for Skyscanner API partner access
 * - Use the Skyscanner Flights Search API (requires approval)
 *
 * TODO: Implement this scraper when ready
 */
export class SkyscannerScraper implements IScraper {
  readonly source = 'skyscanner';

  isAvailable(): boolean {
    return false; // TODO: Return true once implemented
  }

  async search(_params: ScraperSearchParams): Promise<ScrapedFlight[]> {
    // TODO: Implement Skyscanner API integration
    throw new Error('SkyscannerScraper is not yet implemented');
  }
}
