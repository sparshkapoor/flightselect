import { IScraper, ScraperSearchParams, ScrapedFlight } from '../scraper.interface';

/**
 * Amadeus scraper — NOT YET IMPLEMENTED
 *
 * Amadeus has a REAL, well-documented public API available for developers:
 * https://developers.amadeus.com/
 *
 * This is the MOST VIABLE option for real flight data. Steps to implement:
 * 1. Register at https://developers.amadeus.com/
 * 2. Create an app to get API key and secret
 * 3. Set AMADEUS_API_KEY and AMADEUS_API_SECRET in .env
 * 4. Install the official SDK: npm install amadeus
 * 5. Use the Flight Offers Search API:
 *    https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search
 *
 * TODO: Implement this scraper using the Amadeus Node.js SDK
 */
export class AmadeusScraper implements IScraper {
  readonly source = 'amadeus';

  isAvailable(): boolean {
    // TODO: Return true when AMADEUS_API_KEY and AMADEUS_API_SECRET are set
    return !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
  }

  async search(_params: ScraperSearchParams): Promise<ScrapedFlight[]> {
    // TODO: Implement using official Amadeus SDK
    // const Amadeus = require('amadeus');
    // const amadeus = new Amadeus({
    //   clientId: process.env.AMADEUS_API_KEY,
    //   clientSecret: process.env.AMADEUS_API_SECRET,
    // });
    throw new Error('AmadeusScraper is not yet implemented. See comments for setup instructions.');
  }
}
