import type { Flight, Comparison } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';

export interface DirectionSplit {
  outbound: Flight[];
  return: Flight[];
}

export function splitFlightsByDirection(
  flights: Flight[],
  originAirport: string,
  destinationAirport: string
): DirectionSplit {
  const outbound: Flight[] = [];
  const ret: Flight[] = [];
  for (const f of flights) {
    if (f.departureAirport === originAirport && f.arrivalAirport === destinationAirport) {
      outbound.push(f);
    } else if (f.departureAirport === destinationAirport && f.arrivalAirport === originAirport) {
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

  if (bestSamePrice === Infinity) {
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
  };
}
