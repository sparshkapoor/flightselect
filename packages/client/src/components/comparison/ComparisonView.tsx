import { useMemo } from 'react';
import type { Comparison, Flight, BookingOption } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';
import { RoundTripBundle } from './RoundTripBundle';
import { MixAndMatchSection } from './MixAndMatchSection';
import { PriceComparisonChart } from './PriceComparisonChart';
import { ComparisonTable } from './ComparisonTable';
import { AIInsightCard } from './AIInsightCard';
import { TravelIntelligenceCard } from './TravelIntelligenceCard';
import { useRoundTripBookingUrl } from '../../hooks/useRoundTripBookingUrl';
import { useBatchBookingOptions } from '../../hooks/useBatchBookingOptions';
import { formatFlightDate } from '../../utils/formatters';
import { countTiedAtPrice } from '../../utils/flightComparison';

interface ComparisonViewProps {
  comparison: Comparison;
  roundTripFlights: Flight[];
  oneWayOutboundFlights: Flight[];
  oneWayReturnFlights: Flight[];
  /** Full unfiltered leg lists — used only to count how many other flights
   *  tie the hero's chosen price, so the hero can hint there's more to see.
   *  Optional: the standalone saved-comparison view doesn't have these. */
  allOutboundFlights?: Flight[];
  allReturnFlights?: Flight[];
  /** SearchQuery context for the AI Insight's booking-window reasoning.
   *  Absent on the standalone saved-comparison view, which has no SearchQuery. */
  flexibleDatesUsed?: boolean;
  flexibleDateRangeDays?: number | null;
  searchCreatedAt?: string;
}

export function ComparisonView({
  comparison,
  roundTripFlights,
  oneWayOutboundFlights,
  oneWayReturnFlights,
  allOutboundFlights = [],
  allReturnFlights = [],
  flexibleDatesUsed,
  flexibleDateRangeDays,
  searchCreatedAt,
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

  // Distinguishes "genuinely no sellers" from "couldn't check" (missing
  // booking token, SerpAPI error, etc.) once optionsFor resolves to an empty
  // array — undefined here means a true empty result, not an error.
  const messageFor = (id: string | undefined): string | undefined =>
    id ? batchOptions?.[id]?.message : undefined;

  const savingsAmount = comparison.priceDifference !== null ? Math.abs(Number(comparison.priceDifference)) : null;
  const isRoundTripCheapest = comparison.recommendedOption === RecommendedOption.ROUND_TRIP;

  // Derived from the actual chosen flights, not the raw search request — once
  // flexible dates can shift the flown date away from what was requested,
  // this is the only source of truth for what's actually being booked.
  const tripDateRange = hasRoundTrip
    ? `${formatFlightDate(rtOutbound.departureTime)} – ${formatFlightDate(rtReturn.departureTime)}`
    : bestOutbound
    ? formatFlightDate(bestOutbound.departureTime)
    : null;
  const tripSubtitle = origin && destination
    ? `${origin} → ${destination}${tripDateRange ? ` · ${tripDateRange}` : ''}`
    : null;

  // Days between when the search was made and the actually-flown date (which
  // flexible dates can shift away from what was originally requested) — lets
  // the AI Insight reason about booking-window proximity. Clamp negative
  // values (clock skew / edge cases) to null rather than passing nonsense.
  const flownDepartureTime = hasRoundTrip ? rtOutbound.departureTime : bestOutbound?.departureTime;
  const daysUntilDeparture = (() => {
    if (!flownDepartureTime || !searchCreatedAt) return null;
    const days = Math.round(
      (new Date(flownDepartureTime).getTime() - new Date(searchCreatedAt).getTime()) / 86_400_000
    );
    return days >= 0 ? days : null;
  })();

  const tiedCountFor = (flight: Flight | undefined, allLegFlights: Flight[]): number =>
    flight ? countTiedAtPrice(allLegFlights, flight.id, Number(flight.price)) : 0;

  if (!hasRoundTrip) {
    // No return flights for this route — render a graceful single-leg hero
    // (same shell as the round-trip case) instead of a separate apologetic block.
    if (!bestOutbound) return null;

    return (
      <div className="space-y-6">
        <div className="animate-fadeInUp">
          <div className="flex items-center justify-between">
            <h2 className="text-h1 text-ink">Your Trip</h2>
          </div>
          {tripSubtitle && (
            <div className="text-sm font-mono text-ink-cool mt-1">{tripSubtitle}</div>
          )}
        </div>

        {origin && destination && (
          <div className="animate-fadeInUp" style={{ animationDelay: '60ms' }}>
            <AIInsightCard
              comparison={comparison}
              origin={origin}
              destination={destination}
              daysUntilDeparture={daysUntilDeparture}
              flexibleDatesUsed={flexibleDatesUsed}
              flexibleDateRangeDays={flexibleDateRangeDays}
            />
          </div>
        )}

        {origin && destination && (
          <div className="animate-fadeInUp" style={{ animationDelay: '120ms' }}>
            <TravelIntelligenceCard
              comparison={comparison}
              origin={origin}
              destination={destination}
              flights={[bestOutbound]}
            />
          </div>
        )}

        <div className="animate-fadeInUp" style={{ animationDelay: '180ms' }}>
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
            outboundMessage={messageFor(bestOutbound.id)}
            outboundTiedCount={tiedCountFor(bestOutbound, allOutboundFlights)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fadeInUp">
        <div className="flex items-center justify-between">
          <h2 className="text-h1 text-ink">Your Trip</h2>
        </div>
        {tripSubtitle && (
          <div className="text-sm font-mono text-ink-cool mt-1">{tripSubtitle}</div>
        )}
      </div>

      {origin && destination && (
        <div className="animate-fadeInUp" style={{ animationDelay: '60ms' }}>
          <AIInsightCard
            comparison={comparison}
            origin={origin}
            destination={destination}
            daysUntilDeparture={daysUntilDeparture}
            flexibleDatesUsed={flexibleDatesUsed}
            flexibleDateRangeDays={flexibleDateRangeDays}
          />
        </div>
      )}

      {origin && destination && (
        <div className="animate-fadeInUp" style={{ animationDelay: '120ms' }}>
          <TravelIntelligenceCard
            comparison={comparison}
            origin={origin}
            destination={destination}
            flights={[rtOutbound, rtReturn, oneWayOutboundFlights[0], oneWayReturnFlights[0]].filter(
              (f): f is Flight => Boolean(f)
            )}
          />
        </div>
      )}

      {!comparison.sameAirlineAvailable ? (
        <div className="animate-fadeInUp" style={{ animationDelay: '180ms' }}>
          <RoundTripBundle
            outboundFlight={rtOutbound}
            returnFlight={rtReturn}
            totalPrice={Number(comparison.roundTripTotalPrice)}
            isCheapest
            savingsAmount={null}
            combinedBookingUrl={combinedBookingUrl}
            outboundOptions={optionsFor(rtOutbound.id)}
            returnOptions={optionsFor(rtReturn.id)}
            optionsLoading={optionsLoading}
            outboundMessage={messageFor(rtOutbound.id)}
            returnMessage={messageFor(rtReturn.id)}
            outboundTiedCount={tiedCountFor(rtOutbound, allOutboundFlights)}
            returnTiedCount={tiedCountFor(rtReturn, allReturnFlights)}
          />
          <p className="text-sm text-ink-faint mt-3">
            All available flights for this route are on {rtOutbound.airline} — no mixed-airline alternative exists to compare.
          </p>
        </div>
      ) : isRoundTripCheapest ? (
        <>
          <div className="animate-fadeInUp" style={{ animationDelay: '180ms' }}>
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
              outboundMessage={messageFor(rtOutbound.id)}
              returnMessage={messageFor(rtReturn.id)}
              outboundTiedCount={tiedCountFor(rtOutbound, allOutboundFlights)}
              returnTiedCount={tiedCountFor(rtReturn, allReturnFlights)}
            />
          </div>

          {oneWayOutboundFlights[0] && oneWayReturnFlights[0] && (
            <div className="animate-fadeInUp" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-3 my-10">
                <div className="flex-1 h-px bg-hairline" />
                <span className="text-eyebrow text-ink-faint shrink-0">or mix airlines</span>
                <div className="flex-1 h-px bg-hairline" />
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
                outboundMessage={messageFor(oneWayOutboundFlights[0].id)}
                returnMessage={messageFor(oneWayReturnFlights[0].id)}
                outboundTiedCount={tiedCountFor(oneWayOutboundFlights[0], allOutboundFlights)}
                returnTiedCount={tiedCountFor(oneWayReturnFlights[0], allReturnFlights)}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {oneWayOutboundFlights[0] && oneWayReturnFlights[0] && (
            <div className="animate-fadeInUp" style={{ animationDelay: '180ms' }}>
              <MixAndMatchSection
                outboundFlight={oneWayOutboundFlights[0]}
                returnFlight={oneWayReturnFlights[0]}
                totalPrice={Number(comparison.oneWayTotalPrice)}
                isCheapest={!isRoundTripCheapest}
                savingsAmount={savingsAmount}
                outboundOptions={optionsFor(oneWayOutboundFlights[0].id)}
                returnOptions={optionsFor(oneWayReturnFlights[0].id)}
                optionsLoading={optionsLoading}
                outboundMessage={messageFor(oneWayOutboundFlights[0].id)}
                returnMessage={messageFor(oneWayReturnFlights[0].id)}
                outboundTiedCount={tiedCountFor(oneWayOutboundFlights[0], allOutboundFlights)}
                returnTiedCount={tiedCountFor(oneWayReturnFlights[0], allReturnFlights)}
                hero
              />
            </div>
          )}

          <div className="animate-fadeInUp" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-3 my-10">
              <div className="flex-1 h-px bg-hairline" />
              <span className="text-eyebrow text-ink-faint shrink-0">or same airline</span>
              <div className="flex-1 h-px bg-hairline" />
            </div>

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
              outboundMessage={messageFor(rtOutbound.id)}
              returnMessage={messageFor(rtReturn.id)}
              outboundTiedCount={tiedCountFor(rtOutbound, allOutboundFlights)}
              returnTiedCount={tiedCountFor(rtReturn, allReturnFlights)}
            />
          </div>
        </>
      )}

      {comparison.sameAirlineAvailable && (
        <details className="group border-t border-hairline pt-6">
          <summary className="flex items-center gap-2 text-eyebrow text-ink-subtle hover:text-ink-muted cursor-pointer list-none transition-colors duration-150">
            <svg
              className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            See full price breakdown
          </summary>
          <div className="mt-4 space-y-6 bg-surface-1 border border-hairline rounded-xl p-5">
            <div>
              <h3 className="text-h2 text-[1rem] text-ink-muted mb-3">Price Comparison</h3>
              <PriceComparisonChart
                roundTripTotal={Number(comparison.roundTripTotalPrice)}
                oneWayTotal={Number(comparison.oneWayTotalPrice)}
              />
            </div>
            <div>
              <h3 className="text-h2 text-[1rem] text-ink-muted mb-3">Detailed Comparison</h3>
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
      )}
    </div>
  );
}
