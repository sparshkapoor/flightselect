function encodeVarint(n: number): number[] {
  const out: number[] = [];
  while (n > 0x7f) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
  out.push(n & 0x7f);
  return out;
}
function pbString(field: number, s: string): number[] {
  const d = [...Buffer.from(s, 'utf8')];
  return [...encodeVarint((field << 3) | 2), ...encodeVarint(d.length), ...d];
}
function pbVarint(field: number, v: number): number[] {
  return [...encodeVarint((field << 3) | 0), ...encodeVarint(v)];
}
function pbBytes(field: number, data: number[]): number[] {
  return [...encodeVarint((field << 3) | 2), ...encodeVarint(data.length), ...data];
}

// Constructs a Google Flights deep-link for a specific one-way flight.
// tfs format reverse-engineered by the community (fast-flights, AWeirdDev/flights).
export function buildGoogleFlightsTfsUrl(
  departureAirport: string,
  arrivalAirport: string,
  departureDate: string, // YYYY-MM-DD
  airlineCode: string,   // e.g. "UA"
  flightNum: string,     // e.g. "1343"
): string {
  const inner: number[] = [
    ...pbString(1, departureAirport),
    ...pbString(2, departureDate),
    ...pbString(3, arrivalAirport),
    ...pbString(5, airlineCode),
    ...pbString(6, flightNum),
  ];
  const depNode: number[] = [...pbVarint(1, 1), ...pbString(2, departureAirport)];
  const arrNode: number[] = [...pbVarint(1, 1), ...pbString(2, arrivalAirport)];
  const leg: number[] = [
    ...pbString(2, departureDate),
    ...pbBytes(4, inner),
    ...pbBytes(13, depNode),
    ...pbBytes(14, arrNode),
  ];
  const tfs: number[] = [
    ...pbVarint(1, 28),
    ...pbVarint(2, 2),   // 2 = one-way
    ...pbBytes(3, leg),
    ...pbVarint(8, 1),
    ...pbVarint(9, 1),
    ...pbVarint(14, 1),
    ...pbVarint(19, 1),
  ];
  const b64 = Buffer.from(tfs).toString('base64url');
  return `https://www.google.com/travel/flights/search?tfs=${b64}&tfu=EgIIAQ&hl=en&gl=us&curr=USD`;
}

export function buildGoogleFlightsSearchUrl(
  origin: string,
  destination: string,
  departureDate: string,
): string {
  return `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${destination}+on+${departureDate}`;
}

// Derives a booking URL from the flight's stored data. Never stale — always
// computed fresh from the immutable flight identifiers (route + date + flight number).
export function deriveBookingUrl(
  flightNumber: string,
  departureAirport: string,
  arrivalAirport: string,
  departureTime: Date,
): string {
  const departureDate = departureTime.toISOString().slice(0, 10);
  const match = flightNumber.match(/^([A-Z0-9]{2})\s*(\d+)$/);
  if (match) {
    return buildGoogleFlightsTfsUrl(departureAirport, arrivalAirport, departureDate, match[1], match[2]);
  }
  return buildGoogleFlightsSearchUrl(departureAirport, arrivalAirport, departureDate);
}
