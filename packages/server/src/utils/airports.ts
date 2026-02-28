/** Set of commonly used IATA airport codes for validation */
export const VALID_IATA_CODES = new Set([
  'ATL', 'LAX', 'ORD', 'DFW', 'DEN', 'JFK', 'SFO', 'SEA', 'LAS', 'MCO',
  'EWR', 'CLT', 'PHX', 'IAH', 'MIA', 'BOS', 'MSP', 'DTW', 'FLL', 'PHL',
  'LGA', 'BWI', 'SLC', 'DCA', 'MDW', 'TPA', 'PDX', 'HNL', 'STL', 'OAK',
  'LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'MUC', 'ZRH',
  'LIS', 'CPH', 'ARN', 'OSL', 'HEL', 'VIE', 'BRU', 'DUB', 'MAN', 'EDI',
  'NRT', 'HND', 'ICN', 'PEK', 'PVG', 'HKG', 'SIN', 'BKK', 'KUL', 'CGK',
  'DEL', 'BOM', 'DXB', 'AUH', 'DOH', 'RUH', 'CAI', 'JNB', 'NBO', 'ADD',
  'SYD', 'MEL', 'BNE', 'AKL', 'YYZ', 'YVR', 'YUL', 'GRU', 'GIG', 'EZE',
  'SCL', 'BOG', 'LIM', 'MEX', 'CUN', 'PTY',
]);

export function isValidIATACode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code) && VALID_IATA_CODES.has(code);
}

/**
 * Returns a list of geographically sensible layover airports given
 * an origin and destination pair. Used by the mock scraper.
 */
export function getLayoverOptions(origin: string, destination: string): string[] {
  const domestic = ['ORD', 'DFW', 'ATL', 'DEN', 'PHX', 'IAH', 'CLT'];
  const transatlantic = ['JFK', 'EWR', 'ORD', 'LHR', 'CDG', 'AMS', 'FRA'];
  const transpacific = ['HNL', 'NRT', 'ICN', 'SFO', 'LAX', 'ORD', 'JFK'];
  const middleEast = ['DXB', 'DOH', 'AUH'];

  const intlDestinations = ['LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'FCO', 'DUB', 'MAN', 'ZRH'];
  const asianDestinations = ['NRT', 'HND', 'ICN', 'PEK', 'PVG', 'HKG', 'SIN', 'BKK', 'KUL', 'DEL', 'BOM'];

  if (intlDestinations.includes(destination) || intlDestinations.includes(origin)) {
    return transatlantic.filter((a) => a !== origin && a !== destination);
  }
  if (asianDestinations.includes(destination) || asianDestinations.includes(origin)) {
    return transpacific.filter((a) => a !== origin && a !== destination);
  }
  if (middleEast.includes(destination) || middleEast.includes(origin)) {
    return middleEast.filter((a) => a !== origin && a !== destination);
  }
  return domestic.filter((a) => a !== origin && a !== destination);
}
