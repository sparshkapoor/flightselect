import type { Flight, BookingOption } from '@flightselect/shared';
import { FlightTimeline } from '../results/FlightTimeline';
import { airlineInitials, airlineColor } from '../../utils/airlineBadge';
import { formatPriceDifference } from '../../utils/formatters';

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
}

interface LegRowProps {
  flight: Flight;
  direction: 'Outbound' | 'Return';
  options: BookingOption[] | null;
  loading: boolean;
}

function LegRow({ flight, direction, options, loading }: LegRowProps) {
  const handleViewGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flight.bookingUrl) window.open(flight.bookingUrl, '_blank', 'noopener,noreferrer');
  };
  const topOption = options && options.length > 0 ? options[0] : null;

  return (
    <div className="px-2 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
          {direction}
        </div>
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
        <span className="text-base font-semibold text-gray-500 tabular-nums">
          ${Number(flight.price).toFixed(0)}
        </span>
        {loading ? (
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mt-0.5" />
        ) : topOption ? (
          <a
            href={topOption.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline"
          >
            Book on {topOption.seller} →
          </a>
        ) : (
          <button
            onClick={handleViewGoogle}
            className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline"
          >
            View on Google Flights
          </button>
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
}: RoundTripBundleProps) {
  const airline = outboundFlight.airline;
  const eyebrow = returnFlight
    ? 'ROUND TRIP · SAME AIRLINE'
    : 'ONE-WAY · NO RETURN FOUND FOR THIS ROUTE';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-200 p-6 sm:p-8 relative overflow-hidden">
      {/* Eyebrow + airline header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          {eyebrow}
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${airlineColor(airline)}`}
          >
            {airlineInitials(airline)}
          </div>
          <span className="text-sm font-semibold text-gray-700">{airline}</span>
        </div>
      </div>

      {/* Price + savings row */}
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <span className="text-4xl font-bold tracking-tight tabular-nums text-gray-900">
          ${totalPrice.toFixed(0)}
        </span>
        {returnFlight && isCheapest && savingsAmount !== null && savingsAmount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
            Saves {formatPriceDifference(savingsAmount)} vs. mixing airlines
          </span>
        )}
        {returnFlight && !isCheapest && savingsAmount !== null && savingsAmount > 0 && (
          <span className="text-xs font-medium text-gray-500">
            Mixing airlines saves {formatPriceDifference(savingsAmount)} — see below
          </span>
        )}
      </div>

      {/* Legs */}
      <div className="divide-y divide-gray-100 -mx-2">
        <LegRow flight={outboundFlight} direction="Outbound" options={outboundOptions} loading={optionsLoading} />
        {returnFlight && (
          <>
            <div className="flex items-center justify-center py-1 relative -my-3">
              <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13a4 4 0 010 8H8m0 0l3-3m-3 3l3 3" />
                </svg>
              </div>
            </div>
            <LegRow flight={returnFlight} direction="Return" options={returnOptions} loading={optionsLoading} />
          </>
        )}
      </div>

      {/* Combined CTA — round trip only */}
      {returnFlight && (
        <div className="mt-4">
          <button
            onClick={() => combinedBookingUrl && window.open(combinedBookingUrl, '_blank', 'noopener,noreferrer')}
            disabled={!combinedBookingUrl}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white font-semibold text-base py-3.5 rounded-xl transition-colors duration-150 shadow-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Book round trip on Google Flights →
          </button>
          <div className="text-center text-xs text-gray-400 mt-2">
            {combinedBookingUrl ? 'Both flights pre-selected — no extra steps' : 'Combined link unavailable for this pair'}
          </div>
        </div>
      )}
    </div>
  );
}
