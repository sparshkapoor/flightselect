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

// Field 16 "no limit" sentinel present on every real Google-issued tfs
// (a nested message containing a max-uint64 varint at field 1). Purpose
// unconfirmed (likely a stops/price/duration "no limit" marker) but it's
// always present, so we emit it for parity rather than omit it.
const NO_LIMIT_F16: number[] = [0x08, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01];

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
    ...pbVarint(2, 2),   // 2 = one-way (NOTE: this field is 2 for BOTH one-way and round-trip — trip type is field 19, see below)
    ...pbBytes(3, leg),
    ...pbVarint(8, 1),
    ...pbVarint(9, 1),
    ...pbVarint(14, 1),
    ...pbBytes(16, NO_LIMIT_F16),
    ...pbVarint(19, 2),  // trip type: 2 = one-way, 1 = round-trip (verified against real Google-issued URLs of both types)
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

export interface FlightSegment {
  origin: string;
  date: string; // YYYY-MM-DD
  dest: string;
  airline: string;
  flightNum: string;
}

// Builds one "leg" (one direction of travel) from its real segments. Verified
// byte-for-byte against a tfs Google itself issued for a real connecting
// itinerary (EWR->PDX->LAS, AS1630+AS757) — this is the actual format, not a
// guess: a leg has one repeated `segment` entry (field 4) per flight, a
// leg-level overall-airline marker, then overall departure/arrival nodes.
function buildLegBytes(segments: FlightSegment[], overallOrigin: string, overallDest: string): number[] {
  const inner: number[] = [...pbString(2, segments[0].date)];
  for (const seg of segments) {
    const segBytes = [
      ...pbString(1, seg.origin),
      ...pbString(2, seg.date),
      ...pbString(3, seg.dest),
      ...pbString(5, seg.airline),
      ...pbString(6, seg.flightNum),
    ];
    inner.push(...pbBytes(4, segBytes));
  }
  inner.push(...pbString(6, segments[0].airline));
  const depNode = [...pbVarint(1, 1), ...pbString(2, overallOrigin)];
  const arrNode = [...pbVarint(1, 1), ...pbString(2, overallDest)];
  inner.push(...pbBytes(13, depNode), ...pbBytes(14, arrNode));
  return inner;
}

// One-way deep-link built from the flight's real segment list (works for
// direct flights — one segment — and connecting flights — multiple segments
// — uniformly, since this is the same leg structure Google itself uses).
export function buildGoogleFlightsTfsUrlFromSegments(
  segments: FlightSegment[],
  overallOrigin: string,
  overallDest: string,
): string {
  const leg = buildLegBytes(segments, overallOrigin, overallDest);
  const tfs: number[] = [
    ...pbVarint(1, 28),
    ...pbVarint(2, 2), // 2 for both trip types — see field 19 below
    ...pbBytes(3, leg),
    ...pbVarint(8, 1),
    ...pbVarint(9, 1),
    ...pbVarint(14, 1),
    ...pbBytes(16, NO_LIMIT_F16),
    ...pbVarint(19, 2), // trip type: 2 = one-way
  ];
  const b64 = Buffer.from(tfs).toString('base64url');
  return `https://www.google.com/travel/flights/search?tfs=${b64}&tfu=EgIIAQ&hl=en&gl=us&curr=USD`;
}

// Round-trip deep-link built from both legs' real segment lists — the one
// case Google Flights fully pre-selects (no "choose your return" step),
// unlike a single-leg tfs. Same top-level message as the one-way builder,
// but field 19 = 1 (round trip) and two repeated field-3 leg entries.
export function buildGoogleFlightsRoundTripTfsUrl(
  outboundSegments: FlightSegment[],
  outboundOrigin: string,
  outboundDest: string,
  returnSegments: FlightSegment[],
  returnOrigin: string,
  returnDest: string,
): string {
  const outboundLeg = buildLegBytes(outboundSegments, outboundOrigin, outboundDest);
  const returnLeg = buildLegBytes(returnSegments, returnOrigin, returnDest);
  const tfs: number[] = [
    ...pbVarint(1, 28),
    ...pbVarint(2, 2), // 2 for both trip types — see field 19 below
    ...pbBytes(3, outboundLeg),
    ...pbBytes(3, returnLeg),
    ...pbVarint(8, 1),
    ...pbVarint(9, 1),
    ...pbVarint(14, 1),
    ...pbBytes(16, NO_LIMIT_F16),
    ...pbVarint(19, 1), // trip type: 1 = round-trip
  ];
  const b64 = Buffer.from(tfs).toString('base64url');
  return `https://www.google.com/travel/flights/search?tfs=${b64}&tfu=EgIIAQ&hl=en&gl=us&curr=USD`;
}

// SerpAPI's `booking_token` is base64 JSON: [opaqueGoogleToken, [[origin, date,
// dest, layoverAirport, airline, flightNum], ...]] — one entry per real
// segment, already exactly what we need to build an accurate multi-segment
// leg. This is already stored in Flight.rawData.bookingToken for every flight.
export function parseSegmentsFromBookingToken(bookingToken: string): FlightSegment[] | null {
  try {
    const decoded = JSON.parse(Buffer.from(bookingToken, 'base64').toString('utf8'));
    const segmentsRaw = decoded?.[1];
    if (!Array.isArray(segmentsRaw) || segmentsRaw.length === 0) return null;
    return segmentsRaw.map(([origin, date, dest, , airline, flightNum]: string[]) => ({
      origin,
      date,
      dest,
      airline,
      flightNum,
    }));
  } catch {
    return null;
  }
}

// Derives a booking URL from the flight's stored data. Never stale — always
// computed fresh from the immutable flight identifiers.
//
// Prefers the real segment list from rawData.bookingToken (accurate for both
// direct and connecting flights — see buildGoogleFlightsTfsUrlFromSegments).
// Falls back to the single-flight-number tfs (direct flights only — encoding
// a connecting flight's single stored segment as the whole trip describes a
// flight that doesn't exist and Google Flights rejects it), then to a generic
// search URL if neither produces a usable link.
export function deriveBookingUrl(
  flightNumber: string,
  departureAirport: string,
  arrivalAirport: string,
  departureTime: Date,
  isLayover = false,
  rawData?: Record<string, unknown> | null,
): string {
  const departureDate = departureTime.toISOString().slice(0, 10);

  const bookingToken = typeof rawData?.bookingToken === 'string' ? rawData.bookingToken : null;
  const segments = bookingToken ? parseSegmentsFromBookingToken(bookingToken) : null;
  if (segments) {
    return buildGoogleFlightsTfsUrlFromSegments(segments, departureAirport, arrivalAirport);
  }

  const match = !isLayover && flightNumber.match(/^([A-Z0-9]{2})\s*(\d+)$/);
  if (match) {
    return buildGoogleFlightsTfsUrl(departureAirport, arrivalAirport, departureDate, match[1], match[2]);
  }
  return buildGoogleFlightsSearchUrl(departureAirport, arrivalAirport, departureDate);
}

export interface RoundTripLegInput {
  departureAirport: string;
  arrivalAirport: string;
  rawData?: Record<string, unknown> | null;
}

// Derives a combined round-trip booking URL for a matched outbound+return
// pair. Returns null (not a broken link) if either leg is missing the real
// segment data needed to build an accurate tfs — there's no honest fallback
// for a round-trip CTA specifically, since a single-flight-number guess for
// one leg would describe a different (possibly nonexistent) itinerary.
export function deriveRoundTripBookingUrl(
  outbound: RoundTripLegInput,
  ret: RoundTripLegInput,
): string | null {
  const outboundToken = typeof outbound.rawData?.bookingToken === 'string' ? outbound.rawData.bookingToken : null;
  const returnToken = typeof ret.rawData?.bookingToken === 'string' ? ret.rawData.bookingToken : null;

  const outboundSegments = outboundToken ? parseSegmentsFromBookingToken(outboundToken) : null;
  const returnSegments = returnToken ? parseSegmentsFromBookingToken(returnToken) : null;
  if (!outboundSegments || !returnSegments) return null;

  return buildGoogleFlightsRoundTripTfsUrl(
    outboundSegments, outbound.departureAirport, outbound.arrivalAirport,
    returnSegments, ret.departureAirport, ret.arrivalAirport,
  );
}
