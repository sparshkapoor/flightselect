export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const AIRPORTS: Airport[] = [
  // US — Top 30
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'US', lat: 33.6407, lng: -84.4277 },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US', lat: 33.9416, lng: -118.4085 },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US', lat: 41.9742, lng: -87.9073 },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US', lat: 32.8998, lng: -97.0403 },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'US', lat: 39.8561, lng: -104.6737 },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US', lat: 40.6413, lng: -73.7781 },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US', lat: 37.6213, lng: -122.3790 },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US', lat: 47.4502, lng: -122.3088 },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US', lat: 36.0840, lng: -115.1537 },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US', lat: 28.4312, lng: -81.3081 },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'US', lat: 40.6895, lng: -74.1745 },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'US', lat: 35.2144, lng: -80.9473 },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'US', lat: 33.4352, lng: -112.0101 },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'US', lat: 29.9902, lng: -95.3368 },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'US', lat: 25.7959, lng: -80.2870 },
  { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'US', lat: 42.3656, lng: -71.0096 },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'US', lat: 44.8848, lng: -93.2223 },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', country: 'US', lat: 42.2162, lng: -83.3554 },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', country: 'US', lat: 26.0726, lng: -80.1527 },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'US', lat: 39.8744, lng: -75.2424 },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', country: 'US', lat: 39.1754, lng: -76.6684 },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', country: 'US', lat: 40.7884, lng: -111.9778 },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', country: 'US', lat: 38.8512, lng: -77.0402 },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington', country: 'US', lat: 38.9531, lng: -77.4565 },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', country: 'US', lat: 32.7338, lng: -117.1933 },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', country: 'US', lat: 27.9755, lng: -82.5332 },
  { code: 'PDX', name: 'Portland International', city: 'Portland', country: 'US', lat: 45.5898, lng: -122.5951 },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'US', lat: 21.3187, lng: -157.9224 },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', country: 'US', lat: 30.1975, lng: -97.6664 },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', country: 'US', lat: 36.1263, lng: -86.6774 },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', country: 'US', lat: 35.8801, lng: -78.7880 },
  { code: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', country: 'US', lat: 38.7487, lng: -90.3700 },
  { code: 'OAK', name: 'Oakland International', city: 'Oakland', country: 'US', lat: 37.7126, lng: -122.2197 },
  { code: 'SJC', name: 'San Jose International', city: 'San Jose', country: 'US', lat: 37.3626, lng: -121.9291 },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', country: 'US', lat: 41.7868, lng: -87.7522 },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US', lat: 40.7769, lng: -73.8740 },
  // Canada
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA', lat: 43.6777, lng: -79.6248 },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA', lat: 49.1939, lng: -123.1844 },
  { code: 'YUL', name: 'Montréal-Trudeau International', city: 'Montreal', country: 'CA', lat: 45.4706, lng: -73.7408 },
  { code: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'CA', lat: 51.1315, lng: -114.0106 },
  // Europe
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'GB', lat: 51.4700, lng: -0.4543 },
  { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'GB', lat: 51.1537, lng: -0.1821 },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR', lat: 49.0097, lng: 2.5479 },
  { code: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'FR', lat: 48.7233, lng: 2.3794 },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'NL', lat: 52.3105, lng: 4.7683 },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE', lat: 50.0379, lng: 8.5622 },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE', lat: 48.3537, lng: 11.7860 },
  { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES', lat: 40.4983, lng: -3.5676 },
  { code: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'ES', lat: 41.2974, lng: 2.0833 },
  { code: 'FCO', name: 'Leonardo da Vinci International', city: 'Rome', country: 'IT', lat: 41.8003, lng: 12.2389 },
  { code: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'IT', lat: 45.6306, lng: 8.7281 },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'CH', lat: 47.4647, lng: 8.5492 },
  { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'AT', lat: 48.1103, lng: 16.5697 },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK', lat: 55.6180, lng: 12.6560 },
  { code: 'OSL', name: 'Oslo Airport Gardermoen', city: 'Oslo', country: 'NO', lat: 60.1939, lng: 11.1004 },
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'SE', lat: 59.6519, lng: 17.9186 },
  { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'FI', lat: 60.3172, lng: 24.9633 },
  { code: 'LIS', name: 'Lisbon Airport', city: 'Lisbon', country: 'PT', lat: 38.7813, lng: -9.1359 },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE', lat: 53.4264, lng: -6.2499 },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE', lat: 50.9014, lng: 4.4844 },
  { code: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'GR', lat: 37.9364, lng: 23.9445 },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR', lat: 41.2753, lng: 28.7519 },
  { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'PL', lat: 52.1657, lng: 20.9671 },
  { code: 'PRG', name: 'Václav Havel Airport', city: 'Prague', country: 'CZ', lat: 50.1008, lng: 14.2600 },
  { code: 'BUD', name: 'Budapest Ferenc Liszt International', city: 'Budapest', country: 'HU', lat: 47.4298, lng: 19.2611 },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'GB', lat: 55.9500, lng: -3.3725 },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'GB', lat: 53.3537, lng: -2.2750 },
  // Asia
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'JP', lat: 35.7720, lng: 140.3929 },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'JP', lat: 35.5494, lng: 139.7798 },
  { code: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'JP', lat: 34.4347, lng: 135.2440 },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'KR', lat: 37.4602, lng: 126.4407 },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'CN', lat: 40.0799, lng: 116.6031 },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'CN', lat: 31.1443, lng: 121.8083 },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'HK', lat: 22.3080, lng: 113.9185 },
  { code: 'TPE', name: 'Taiwan Taoyuan International', city: 'Taipei', country: 'TW', lat: 25.0797, lng: 121.2342 },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG', lat: 1.3644, lng: 103.9915 },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH', lat: 13.6900, lng: 100.7501 },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY', lat: 2.7456, lng: 101.7099 },
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID', lat: -6.1256, lng: 106.6559 },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH', lat: 14.5086, lng: 121.0194 },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN', lat: 28.5562, lng: 77.1000 },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN', lat: 19.0896, lng: 72.8656 },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'IN', lat: 13.1986, lng: 77.7066 },
  // Middle East
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'AE', lat: 25.2532, lng: 55.3657 },
  { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'AE', lat: 24.4330, lng: 54.6511 },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'QA', lat: 25.2731, lng: 51.6080 },
  { code: 'TLV', name: 'Ben Gurion Airport', city: 'Tel Aviv', country: 'IL', lat: 32.0114, lng: 34.8867 },
  // Oceania
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'AU', lat: -33.9399, lng: 151.1753 },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU', lat: -37.6690, lng: 144.8410 },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'AU', lat: -27.3942, lng: 153.1218 },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ', lat: -37.0082, lng: 174.7850 },
  // Latin America
  { code: 'GRU', name: 'São Paulo/Guarulhos International', city: 'São Paulo', country: 'BR', lat: -23.4356, lng: -46.4731 },
  { code: 'GIG', name: 'Rio de Janeiro/Galeão International', city: 'Rio de Janeiro', country: 'BR', lat: -22.8090, lng: -43.2436 },
  { code: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'MX', lat: 19.4363, lng: -99.0721 },
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'MX', lat: 21.0365, lng: -86.8771 },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'CO', lat: 4.7016, lng: -74.1469 },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'PE', lat: -12.0219, lng: -77.1143 },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'AR', lat: -34.8222, lng: -58.5358 },
  { code: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'CL', lat: -33.3930, lng: -70.7858 },
  { code: 'PTY', name: 'Tocumen International', city: 'Panama City', country: 'PA', lat: 9.0714, lng: -79.3835 },
  { code: 'SJO', name: 'Juan Santamaría International', city: 'San José', country: 'CR', lat: 9.9981, lng: -84.2041 },
  // Africa
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'ZA', lat: -26.1392, lng: 28.2460 },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA', lat: -33.9648, lng: 18.6017 },
  { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'EG', lat: 30.1219, lng: 31.4056 },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE', lat: -1.3192, lng: 36.9278 },
  { code: 'ADD', name: 'Bole International Airport', city: 'Addis Ababa', country: 'ET', lat: 8.9779, lng: 38.7993 },
  { code: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'MA', lat: 33.3675, lng: -7.5899 },
  { code: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'NG', lat: 6.5774, lng: 3.3212 },
];

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two airports, in miles. */
export function haversineMiles(a: Airport, b: Airport): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * Airports within `radiusMiles` of `code` (excluding `code` itself), nearest
 * first, capped at `maxResults` — bounds how many extra SerpAPI departure/
 * arrival airports a single search can pull in regardless of how wide the
 * radius is.
 */
export function airportsWithin(code: string, radiusMiles: number, maxResults = 4): Airport[] {
  const origin = AIRPORTS.find((a) => a.code === code.toUpperCase());
  if (!origin) return [];

  return AIRPORTS.filter((a) => a.code !== origin.code)
    .map((a) => ({ airport: a, distance: haversineMiles(origin, a) }))
    .filter(({ distance }) => distance <= radiusMiles)
    .sort((x, y) => x.distance - y.distance)
    .slice(0, maxResults)
    .map(({ airport }) => airport);
}

// "Include nearby airports" with no explicit radius uses a tight metro-area
// radius (Tier 1 ergonomics: a NYC search picks up JFK/EWR/LGA without the
// user tuning anything). An explicit radiusMiles (Tier 2) overrides this.
export const DEFAULT_NEARBY_RADIUS_MILES = 75;

/**
 * The full candidate code set for one side of a search: `code` itself plus
 * its nearby airports when expansion is on. Single source of truth shared by
 * the scraper call (joined into one SerpAPI departure_id/arrival_id string),
 * the server-side comparison builder, and the client-side direction split —
 * all three must agree on which airports count as "this search's origin/
 * destination" or nearby-airport flights silently fall out of the comparison.
 */
export function expandAirportCodes(
  code: string,
  includeNearby: boolean,
  radiusMiles: number | null | undefined
): string[] {
  if (!includeNearby) return [code];
  const nearby = airportsWithin(code, radiusMiles ?? DEFAULT_NEARBY_RADIUS_MILES);
  return [code, ...nearby.map((a) => a.code)];
}
