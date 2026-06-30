import type { Flight, BookingOption } from '@flightselect/shared';
import { FlightTimeline } from '../results/FlightTimeline';
import { airlineInitials, airlineColor } from '../../utils/airlineBadge';
import { formatPriceDifference, formatScrapedAt } from '../../utils/formatters';

interface RoundTripBundleProps {
  outboundFlight: Flight;
  returnFlight: Flight | null;
  totalPrice: number;
  isCheapest: boolean;
  savingsAmount: number | null;
  combinedBookingUrl: string | null | undefined;
  outboundOptions: BookingOption[] | null;
  returnOptions: BookingOption[] | null;
  optionsLoading: boolean;
  /** Set only when options resolved to empty — distinguishes a genuine "no
   *  sellers" result (undefined) from a reason it couldn't be checked. */
  outboundMessage?: string;
  returnMessage?: string;
  /** How many OTHER flights on this leg tie the shown flight's price. */
  outboundTiedCount?: number;
  returnTiedCount?: number;
}

interface LegRowProps {
  flight: Flight;
  direction: 'Outbound' | 'Return';
  options: BookingOption[] | null;
  loading: boolean;
  message?: string;
  tiedCount?: number;
}

function LegRow({ flight, direction, options, loading, message, tiedCount = 0 }: LegRowProps) {
  const handleViewGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flight.bookingUrl) window.open(flight.bookingUrl, '_blank', 'noopener,noreferrer');
  };
  const topOption = options && options.length > 0 ? options[0] : null;
  const checked = !loading && options !== null;

  return (
    <div className="px-2 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-eyebrow text-ink-faint mb-0.5">{direction}</div>
        <FlightTimeline
          departureTime={flight.departureTime}
          arrivalTime={flight.arrivalTime}
          departureAirport={flight.departureAirport}
          arrivalAirport={flight.arrivalAirport}
          durationMinutes={flight.durationMinutes}
          isLayover={flight.isLayover}
          layoverAirport={flight.layoverAirport}
          layoverDurationMinutes={flight.layoverDurationMinutes}
        />
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
        <span className="text-base font-semibold font-mono text-ink-muted tabular-nums">
          ${Number(flight.price).toFixed(0)}
        </span>
        {tiedCount > 0 && (
          <span className="text-[0.6875rem] text-ink-faint">
            +{tiedCount} more at this price
          </span>
        )}
        {loading ? (
          <div className="text-xs text-ink-faint">Checking sellers...</div>
        ) : topOption ? (
          <a
            href={topOption.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium hover:underline"
          >
            Book on {topOption.seller} →
          </a>
        ) : (
          <>
            {checked && (
              <div className="text-xs text-ink-faint">{message ?? 'No sellers found'}</div>
            )}
            <button
              onClick={handleViewGoogle}
              className="text-xs text-ink-faint hover:text-ink-cool underline-offset-2 hover:underline"
            >
              View on Google Flights
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function RoundTripBundle({
  outboundFlight,
  returnFlight,
  totalPrice,
  isCheapest,
  savingsAmount,
  combinedBookingUrl,
  outboundOptions,
  returnOptions,
  optionsLoading,
  outboundMessage,
  returnMessage,
  outboundTiedCount = 0,
  returnTiedCount = 0,
}: RoundTripBundleProps) {
  const airline = outboundFlight.airline;
  const eyebrow = returnFlight
    ? 'ROUND TRIP · SAME AIRLINE'
    : 'ONE-WAY · NO RETURN FOUND FOR THIS ROUTE';
  // The recommended option lifts to depth level 2 — surface + border step up
  // together, no separate badge needed. See DESIGN.md "Depth model".
  const recommended = returnFlight && isCheapest;

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-8 relative overflow-hidden transition-all duration-200 ${
        recommended
          ? 'bg-surface-2 border-hairline-strong'
          : 'bg-surface-1 border-hairline hover:border-hairline-strong'
      }`}
    >
      {/* Eyebrow + airline header */}
      <div className="flex items-center justify-between mb-5">
        <span className={`text-eyebrow ${recommended ? 'text-brand-400' : 'text-ink-subtle'}`}>
          {eyebrow}
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${airlineColor(airline)}`}
          >
            {airlineInitials(airline)}
          </div>
          <span className="text-h2 text-[0.95rem] text-ink-muted">{airline}</span>
        </div>
      </div>

      {/* Price + savings row */}
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <span className="text-display tabular-nums text-ink">${totalPrice.toFixed(0)}</span>
        {returnFlight && isCheapest && savingsAmount !== null && savingsAmount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/20">
            Saves {formatPriceDifference(savingsAmount)} vs. mixing airlines
          </span>
        )}
        {returnFlight && !isCheapest && savingsAmount !== null && savingsAmount > 0 && (
          <span className="text-xs font-medium text-ink-cool">
            Mixing airlines saves {formatPriceDifference(savingsAmount)} — see below
          </span>
        )}
      </div>
      <div className="text-xs text-ink-faint mb-6">
        Prices as of {formatScrapedAt(outboundFlight.scrapedAt)} — live prices may have changed
      </div>

      {/* Legs */}
      <div className="divide-y divide-hairline -mx-2">
        <LegRow flight={outboundFlight} direction="Outbound" options={outboundOptions} loading={optionsLoading} message={outboundMessage} tiedCount={outboundTiedCount} />
        {returnFlight && (
          <>
            <div className="flex items-center justify-center py-1 relative -my-3">
              <div className="w-6 h-6 rounded-full bg-surface-2 border border-hairline-strong flex items-center justify-center text-ink-cool">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13a4 4 0 010 8H8m0 0l3-3m-3 3l3 3" />
                </svg>
              </div>
            </div>
            <LegRow flight={returnFlight} direction="Return" options={returnOptions} loading={optionsLoading} message={returnMessage} tiedCount={returnTiedCount} />
          </>
        )}
      </div>

      {/* Combined CTA — round trip only */}
      {returnFlight && (
        <div className="mt-4">
          <button
            onClick={() => combinedBookingUrl && window.open(combinedBookingUrl, '_blank', 'noopener,noreferrer')}
            disabled={!combinedBookingUrl}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-all duration-150 hover:-translate-y-px hover:scale-[1.015] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
          >
            Book round trip on Google Flights →
          </button>
          <div className="text-center text-xs text-ink-faint mt-2">
            {combinedBookingUrl ? 'Both flights pre-selected — no extra steps' : 'Combined link unavailable for this pair'}
          </div>
        </div>
      )}
    </div>
  );
}
