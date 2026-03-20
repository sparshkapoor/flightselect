export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
  // US — Top 30
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'US' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'US' },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'US' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'US' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'US' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'US' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
  { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'US' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'US' },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', country: 'US' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', country: 'US' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'US' },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', country: 'US' },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', country: 'US' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', country: 'US' },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington', country: 'US' },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', country: 'US' },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', country: 'US' },
  { code: 'PDX', name: 'Portland International', city: 'Portland', country: 'US' },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'US' },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', country: 'US' },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', country: 'US' },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', country: 'US' },
  { code: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', country: 'US' },
  { code: 'OAK', name: 'Oakland International', city: 'Oakland', country: 'US' },
  { code: 'SJC', name: 'San Jose International', city: 'San Jose', country: 'US' },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', country: 'US' },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US' },
  // Canada
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA' },
  { code: 'YUL', name: 'Montréal-Trudeau International', city: 'Montreal', country: 'CA' },
  { code: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'CA' },
  // Europe
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'GB' },
  { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'GB' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR' },
  { code: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'FR' },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'NL' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES' },
  { code: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'ES' },
  { code: 'FCO', name: 'Leonardo da Vinci International', city: 'Rome', country: 'IT' },
  { code: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'IT' },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'CH' },
  { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'AT' },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK' },
  { code: 'OSL', name: 'Oslo Airport Gardermoen', city: 'Oslo', country: 'NO' },
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'SE' },
  { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'FI' },
  { code: 'LIS', name: 'Lisbon Airport', city: 'Lisbon', country: 'PT' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE' },
  { code: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'GR' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR' },
  { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'PL' },
  { code: 'PRG', name: 'Václav Havel Airport', city: 'Prague', country: 'CZ' },
  { code: 'BUD', name: 'Budapest Ferenc Liszt International', city: 'Budapest', country: 'HU' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'GB' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'GB' },
  // Asia
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'JP' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'JP' },
  { code: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'JP' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'KR' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'CN' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'CN' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'HK' },
  { code: 'TPE', name: 'Taiwan Taoyuan International', city: 'Taipei', country: 'TW' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY' },
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID' },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN' },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'IN' },
  // Middle East
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'AE' },
  { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'AE' },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'QA' },
  { code: 'TLV', name: 'Ben Gurion Airport', city: 'Tel Aviv', country: 'IL' },
  // Oceania
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'AU' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'AU' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ' },
  // Latin America
  { code: 'GRU', name: 'São Paulo/Guarulhos International', city: 'São Paulo', country: 'BR' },
  { code: 'GIG', name: 'Rio de Janeiro/Galeão International', city: 'Rio de Janeiro', country: 'BR' },
  { code: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'MX' },
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'MX' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'CO' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'PE' },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'AR' },
  { code: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'CL' },
  { code: 'PTY', name: 'Tocumen International', city: 'Panama City', country: 'PA' },
  { code: 'SJO', name: 'Juan Santamaría International', city: 'San José', country: 'CR' },
  // Africa
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'ZA' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA' },
  { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'EG' },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE' },
  { code: 'ADD', name: 'Bole International Airport', city: 'Addis Ababa', country: 'ET' },
  { code: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'MA' },
  { code: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'NG' },
];

const AIRPORT_CODE_SET = new Set(AIRPORTS.map((a) => a.code));

export function isValidAirportCode(code: string): boolean {
  return AIRPORT_CODE_SET.has(code.toUpperCase());
}

export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}

export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase().trim();
  if (!q) return AIRPORTS.slice(0, 15);

  // Score each airport by match quality (lower = better)
  const scored: { airport: Airport; score: number }[] = [];

  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();

    let score = Infinity;

    // Exact code match
    if (code === q) score = 0;
    // Code starts with query
    else if (code.startsWith(q)) score = 1;
    // City starts with query
    else if (city.startsWith(q)) score = 2;
    // City word starts with query (e.g., "angeles" matches "Los Angeles")
    else if (city.split(/\s+/).some((w) => w.startsWith(q))) score = 3;
    // Code/city/name contains query
    else if (code.includes(q) || city.includes(q) || name.includes(q)) score = 4;
    else continue;

    scored.push({ airport: a, score });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .map((s) => s.airport);
}
