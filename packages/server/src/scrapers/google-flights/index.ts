import { IScraper, ScraperSearchParams, ScrapedFlight } from '../scraper.interface';

/**
 * Google Flights scraper — NOT YET IMPLEMENTED
 *
 * Google Flights does not have an official public API.
 * Implementation options:
 * - Use a headless browser (Playwright/Puppeteer) to scrape google.com/flights
 * - Use an unofficial API wrapper (check current availability and ToS compliance)
 * - Use SerpApi's Google Flights endpoint: https://serpapi.com/google-flights-api
 *
 * TODO: Implement this scraper when ready
 */
export class GoogleFlightsScraper implements IScraper {
  readonly source = 'google_flights';

  isAvailable(): boolean {
    return false; // TODO: Return true once implemented
  }

  async search(_params: ScraperSearchParams): Promise<ScrapedFlight[]> {
    // TODO: Implement Google Flights scraping
    throw new Error('GoogleFlightsScraper is not yet implemented');
  }
}
