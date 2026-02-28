export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
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
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'GB' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR' },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'NL' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'ES' },
  { code: 'FCO', name: 'Leonardo da Vinci International', city: 'Rome', country: 'IT' },
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'JP' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'JP' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'KR' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'HK' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'AE' },
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'AU' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA' },
  { code: 'GRU', name: 'São Paulo/Guarulhos International', city: 'São Paulo', country: 'BR' },
  { code: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'MX' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN' },
];

export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase();
  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  ).slice(0, 10);
}
