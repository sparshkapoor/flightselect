import { AIRPORTS } from '@flightselect/shared';
import type { Airport } from '@flightselect/shared';

// Re-exported so existing `import { AIRPORTS, type Airport } from '../../utils/airportData'`
// call sites keep working — the data itself now lives in @flightselect/shared
// (with lat/lng) so the server's nearby-airport expansion can reuse it without duplication.
export { AIRPORTS };
export type { Airport };

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
