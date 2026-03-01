import { IScraper, ScraperSearchParams, ScrapedFlight } from './scraper.interface';
import { generatePrice } from '../utils/pricing';
import { getLayoverOptions } from '../utils/airports';

const AIRLINES = [
  'Delta', 'United', 'American', 'Southwest', 'JetBlue',
  'Alaska', 'Spirit', 'Frontier', 'British Airways', 'Lufthansa',
  'ANA', 'JAL', 'Emirates', 'Singapore Airlines', 'Air France',
];

const AIRLINE_CODES: Record<string, string> = {
  Delta: 'DL', United: 'UA', American: 'AA', Southwest: 'WN', JetBlue: 'B6',
  Alaska: 'AS', Spirit: 'NK', Frontier: 'F9', 'British Airways': 'BA',
  Lufthansa: 'LH', ANA: 'NH', JAL: 'JL', Emirates: 'EK',
  'Singapore Airlines': 'SQ', 'Air France': 'AF',
};

const INTERNATIONAL_AIRPORTS = new Set([
  'LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'MUC', 'ZRH',
  'LIS', 'CPH', 'ARN', 'OSL', 'HEL', 'VIE', 'BRU', 'DUB', 'MAN', 'EDI',
  'NRT', 'HND', 'ICN', 'PEK', 'PVG', 'HKG', 'SIN', 'BKK', 'KUL', 'CGK',
  'DEL', 'BOM', 'DXB', 'AUH', 'DOH', 'RUH', 'CAI', 'JNB', 'NBO', 'ADD',
  'SYD', 'MEL', 'BNE', 'AKL', 'GRU', 'GIG', 'EZE', 'SCL', 'BOG', 'LIM', 'MEX',
]);

function isInternational(origin: string, destination: string): boolean {
  return INTERNATIONAL_AIRPORTS.has(origin) || INTERNATIONAL_AIRPORTS.has(destination);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFlightDuration(international: boolean, hasLayover: boolean): number {
  const baseDuration = international ? randomInt(480, 900) : randomInt(90, 360);
  const layoverExtra = hasLayover ? randomInt(45, 360) : 0;
  return baseDuration + layoverExtra;
}

function generateFlights(
  origin: string,
  destination: string,
  date: Date,
  cabinClass: string,
  count: number,
): ScrapedFlight[] {
  const international = isInternational(origin, destination);
  const layoverOptions = getLayoverOptions(origin, destination);
  const flights: ScrapedFlight[] = [];
  const scrapedAt = new Date();

  for (let i = 0; i < count; i++) {
    const airline = randomElement(AIRLINES);
    const airlineCode = AIRLINE_CODES[airline];
    const flightNumber = `${airlineCode}${randomInt(100, 9999)}`;
    const layoverCount = randomElement([0, 0, 1, 1, 2]);
    const hasLayover = layoverCount > 0;
    const durationMinutes = generateFlightDuration(international, hasLayover);
    const price = generatePrice(international, cabinClass);

    const depOffset = randomInt(0, 16 * 60);
    const departureTime = new Date(date);
    departureTime.setMinutes(departureTime.getMinutes() + depOffset);

    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + durationMinutes);

    let layoverAirport: string | null = null;
    let layoverDurationMinutes: number | null = null;

    if (hasLayover && layoverOptions.length > 0) {
      layoverAirport = randomElement(layoverOptions);
      layoverDurationMinutes = randomInt(45, 360);
    }

    flights.push({
      airline,
      flightNumber,
      departureAirport: origin,
      arrivalAirport: destination,
      departureTime,
      arrivalTime,
      durationMinutes,
      price,
      currency: 'USD',
      cabinClass,
      isLayover: hasLayover,
      layoverAirport,
      layoverDurationMinutes,
      source: 'mock',
      scrapedAt,
      rawData: {
        mock: true,
        layoverCount,
        international,
      },
    });
  }

  return flights;
}

export class MockScraper implements IScraper {
  readonly source = 'mock';

  isAvailable(): boolean {
    return true;
  }

  async search(params: ScraperSearchParams): Promise<ScrapedFlight[]> {
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));

    const outboundCount = randomInt(5, 20);
    const outboundFlights = generateFlights(
      params.originAirport,
      params.destinationAirport,
      params.departureDate,
      params.cabinClass,
      outboundCount,
    );

    // Generate return flights if returnDate exists
    if (params.returnDate) {
      const returnCount = randomInt(5, 20);
      const returnFlights = generateFlights(
        params.destinationAirport,
        params.originAirport,
        params.returnDate,
        params.cabinClass,
        returnCount,
      );
      return [...outboundFlights, ...returnFlights];
    }

    return outboundFlights;
  }
}
