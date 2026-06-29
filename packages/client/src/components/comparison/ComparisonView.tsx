import { useMemo } from 'react';
import type { Comparison, Flight, BookingOption } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';
import { RoundTripBundle } from './RoundTripBundle';
import { MixAndMatchSection } from './MixAndMatchSection';
import { PriceComparisonChart } from './PriceComparisonChart';
import { ComparisonTable } from './ComparisonTable';
import { AIInsightCard } from './AIInsightCard';
import { useRoundTripBookingUrl } from '../../hooks/useRoundTripBookingUrl';
import { useBatchBookingOptions } from '../../hooks/useBatchBookingOptions';

interface ComparisonViewProps {
  comparison: Comparison;
  roundTripFlights: Flight[];
  oneWayOutboundFlights: Flight[];
  oneWayReturnFlights: Flight[];
}

export function ComparisonView({
  comparison,
  roundTripFlights,
  oneWayOutboundFlights,
  oneWayReturnFlights,
}: ComparisonViewProps) {
  const origin =
    oneWayOutboundFlights[0]?.departureAirport ?? roundTripFlights[0]?.departureAirport ?? '';
  const destination =
    oneWayOutboundFlights[0]?.arrivalAirport ?? roundTripFlights[0]?.arrivalAirport ?? '';

  const hasRoundTrip = comparison.roundTripTotalPrice !== null && roundTripFlights[0] && roundTripFlights[1];
  const rtOutbound = roundTripFlights[0];
  const rtReturn = roundTripFlights[1];
  const bestOutbound = oneWayOutboundFlights[0] ?? roundTripFlights[0];

  const { data: combinedBookingUrl } = useRoundTripBookingUrl(
    hasRoundTrip ? rtOutbound.id : null,
    hasRoundTrip ? rtReturn.id : null
  );

  // This view shows at most 4 flights at once (round-trip pair + mix & match
  // pair) — fetch all of their seller links in one batched request rather
  // than one request per card, since the per-client rate limit allows only
  // one booking-options request per window.
  const eagerFlightIds = useMemo(() => {
    const ids = new Set<string>();
    if (hasRoundTrip) {
      ids.add(rtOutbound.id);
      ids.add(rtReturn.id);
    } else if (bestOutbound) {
      ids.add(bestOutbound.id);
    }
    if (oneWayOutboundFlights[0]) ids.add(oneWayOutboundFlights[0].id);
    if (oneWayReturnFlights[0]) ids.add(oneWayReturnFlights[0].id);
    return [...ids];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoundTrip, rtOutbound?.id, rtReturn?.id, bestOutbound?.id, oneWayOutboundFlights[0]?.id, oneWayReturnFlights[0]?.id]);

  const { data: batchOptions, isLoading: optionsLoading } = useBatchBookingOptions(eagerFlightIds);

  const optionsFor = (id: string | undefined): BookingOption[] | null =>
    id ? batchOptions?.[id]?.options ?? null : null;

  const savingsAmount = comparison.priceDifference !== null ? Math.abs(Number(comparison.priceDifference)) : null;
  const isRoundTripCheapest = comparison.recommendedOption === RecommendedOption.ROUND_TRIP;

  if (!hasRoundTrip) {
    // No return flights for this route — render a graceful single-leg hero
    // (same shell as the round-trip case) instead of a separate apologetic block.
    if (!bestOutbound) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Your Trip</h2>
        </div>

        {origin && destination && (
          <AIInsightCard comparison={comparison} origin={origin} destination={destination} />
        )}

        <RoundTripBundle
          outboundFlight={bestOutbound}
          returnFlight={null}
          totalPrice={Number(comparison.oneWayTotalPrice)}
          isCheapest={false}
          savingsAmount={null}
          combinedBookingUrl={null}
          outboundOptions={optionsFor(bestOutbound.id)}
          returnOptions={null}
          optionsLoading={optionsLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Trip</h2>
      </div>

      {origin && destination && (
        <AIInsightCard comparison={comparison} origin={origin} destination={destination} />
      )}

      <RoundTripBundle
        outboundFlight={rtOutbound}
        returnFlight={rtReturn}
        totalPrice={Number(comparison.roundTripTotalPrice)}
        isCheapest={isRoundTripCheapest}
        savingsAmount={savingsAmount}
        combinedBookingUrl={combinedBookingUrl}
        outboundOptions={optionsFor(rtOutbound.id)}
        returnOptions={optionsFor(rtReturn.id)}
        optionsLoading={optionsLoading}
      />

      {oneWayOutboundFlights[0] && oneWayReturnFlights[0] && (
        <>
          <div className="flex items-center gap-3 my-10">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">
              or mix airlines
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <MixAndMatchSection
            outboundFlight={oneWayOutboundFlights[0]}
            returnFlight={oneWayReturnFlights[0]}
            totalPrice={Number(comparison.oneWayTotalPrice)}
            isCheapest={!isRoundTripCheapest}
            savingsAmount={savingsAmount}
            outboundOptions={optionsFor(oneWayOutboundFlights[0].id)}
            returnOptions={optionsFor(oneWayReturnFlights[0].id)}
            optionsLoading={optionsLoading}
          />
        </>
      )}

      <details className="border-t border-gray-200 pt-6">
        <summary className="text-sm font-semibold text-gray-500 uppercase tracking-wide cursor-pointer">
          See full price breakdown
        </summary>
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Price Comparison</h3>
            <PriceComparisonChart
              roundTripTotal={Number(comparison.roundTripTotalPrice)}
              oneWayTotal={Number(comparison.oneWayTotalPrice)}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Detailed Comparison</h3>
            <ComparisonTable
              roundTripFlights={roundTripFlights}
              oneWayOutboundFlights={oneWayOutboundFlights}
              oneWayReturnFlights={oneWayReturnFlights}
              roundTripTotal={Number(comparison.roundTripTotalPrice)}
              oneWayTotal={Number(comparison.oneWayTotalPrice)}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
