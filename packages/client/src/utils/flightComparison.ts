import type { Flight, Comparison } from '@flightselect/shared';
import { RecommendedOption, expandAirportCodes } from '@flightselect/shared';
import type { FilterState } from '../stores/filterStore';

/**
 * True when any filter is actually constraining results. The recommended
 * round-trip/mix-and-match hero must recompute from the filtered flight
 * lists whenever this is true — previously it only recomputed for
 * selectedAirlines, so e.g. "direct flights only" correctly filtered the
 * outbound/return lists below but left the hero showing a flight with a
 * layover.
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.selectedAirlines.length > 0 ||
    filters.maxPrice !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxDurationMinutes !== undefined ||
    filters.maxLayovers !== undefined ||
    filters.maxLayoverDurationMinutes !== undefined ||
    !!filters.departureTimeStart ||
    !!filters.departureTimeEnd
  );
}

export interface DirectionSplit {
  outbound: Flight[];
  return: Flight[];
}

export function splitFlightsByDirection(
  flights: Flight[],
  originAirport: string,
  destinationAirport: string,
  includeNearbyAirports = false,
  nearbyRadiusMiles?: number | null
): DirectionSplit {
  // Must recognize the same candidate airports the server actually scraped —
  // see comparison.job.ts and search.job.ts, which use the same
  // expandAirportCodes so a nearby-airport flight (e.g. EWR for a JFK search)
  // isn't silently dropped from the results split.
  const originCandidates = new Set(expandAirportCodes(originAirport, includeNearbyAirports, nearbyRadiusMiles));
  const destinationCandidates = new Set(
    expandAirportCodes(destinationAirport, includeNearbyAirports, nearbyRadiusMiles)
  );

  const outbound: Flight[] = [];
  const ret: Flight[] = [];
  for (const f of flights) {
    if (originCandidates.has(f.departureAirport) && destinationCandidates.has(f.arrivalAirport)) {
      outbound.push(f);
    } else if (destinationCandidates.has(f.departureAirport) && originCandidates.has(f.arrivalAirport)) {
      ret.push(f);
    }
  }
  return { outbound, return: ret };
}

// How many OTHER flights in this leg's list share the chosen flight's price —
// used to hint "N more at $X" near the hero's leg price, since the hero only
// ever shows one specific tied flight (see comparison.job.ts's price sort).
export function countTiedAtPrice(legFlights: Flight[], chosenFlightId: string, price: number): number {
  return legFlights.filter((f) => f.id !== chosenFlightId && Number(f.price) === price).length;
}

export function computeFilteredComparison(
  outbound: Flight[],
  returnFlights: Flight[],
  base: Comparison
): Comparison {
  if (outbound.length === 0 || returnFlights.length === 0) return base;

  // Best same-airline round-trip
  let bestSameOut = outbound[0];
  let bestSameRet = returnFlights[0];
  let bestSamePrice = Infinity;

  for (const out of outbound) {
    const matchRet = returnFlights.find((r) => r.airline === out.airline);
    if (matchRet) {
      const total = Number(out.price) + Number(matchRet.price);
      if (total < bestSamePrice) {
        bestSamePrice = total;
        bestSameOut = out;
        bestSameRet = matchRet;
      }
    }
  }

  const sameAirlineAvailable = bestSamePrice !== Infinity;
  if (!sameAirlineAvailable) {
    // No same-airline match — use cheapest overall pair
    bestSamePrice = Number(outbound[0].price) + Number(returnFlights[0].price);
    bestSameOut = outbound[0];
    bestSameRet = returnFlights[0];
  }

  // Best mix: cheapest outbound + cheapest return independently
  const sortedOut = [...outbound].sort((a, b) => Number(a.price) - Number(b.price));
  const sortedRet = [...returnFlights].sort((a, b) => Number(a.price) - Number(b.price));
  const bestMixOut = sortedOut[0];
  const bestMixRet = sortedRet[0];
  const mixPrice = Number(bestMixOut.price) + Number(bestMixRet.price);

  const priceDifference = bestSamePrice - mixPrice;
  const recommendedOption =
    bestSamePrice <= mixPrice ? RecommendedOption.ROUND_TRIP : RecommendedOption.ONE_WAY;

  return {
    ...base,
    roundTripFlightIds: [bestSameOut.id, bestSameRet.id],
    oneWayOutboundFlightIds: [bestMixOut.id],
    oneWayReturnFlightIds: [bestMixRet.id],
    roundTripTotalPrice: bestSamePrice,
    oneWayTotalPrice: mixPrice,
    priceDifference,
    recommendedOption,
    sameAirlineAvailable,
  };
}
