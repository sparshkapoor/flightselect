import type { Flight, BookingOption } from '@flightselect/shared';
import { FlightTimeline } from '../results/FlightTimeline';
import { airlineInitials, airlineColor } from '../../utils/airlineBadge';
import { formatScrapedAt } from '../../utils/formatters';
import { openBooking } from '../../utils/openBooking';

interface LegRowProps {
  flight: Flight;
  legNumber: number;
  options: BookingOption[] | null;
  loading: boolean;
}

function LegRow({ flight, legNumber, options, loading }: LegRowProps) {
  const handleViewGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flight.bookingUrl) window.open(flight.bookingUrl, '_blank', 'noopener,noreferrer');
  };
  const topOption = options && options.length > 0 ? options[0] : null;

  return (
    <div className="px-2 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-eyebrow text-ink-faint mb-0.5">
          <span>Flight {legNumber}</span>
          <span className="text-ink-faint">·</span>
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${airlineColor(flight.airline)}`}
          >
            {airlineInitials(flight.airline)}
          </div>
          <span className="normal-case tracking-normal text-ink-cool">{flight.airline}</span>
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
        <span className="text-base font-semibold font-mono text-ink-muted tabular-nums">
          ${Number(flight.price).toFixed(0)}
        </span>
        {loading ? (
          <div className="h-3 w-20 skeleton mt-0.5" />
        ) : topOption ? (
          <button
            onClick={(e) => { e.stopPropagation(); openBooking(topOption); }}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium hover:underline"
          >
            Book on {topOption.seller} →
          </button>
        ) : (
          <button
            onClick={handleViewGoogle}
            className="text-xs text-ink-faint hover:text-ink-cool underline-offset-2 hover:underline"
          >
            View on Google Flights
          </button>
        )}
      </div>
    </div>
  );
}

interface MultiCityBundleProps {
  /** One flight per leg, already ordered by legIndex. */
  flights: Flight[];
  totalPrice: number;
  combinedBookingUrl: string | null | undefined;
  /** Same order as flights. */
  legOptions: (BookingOption[] | null)[];
  optionsLoading: boolean;
}

export function MultiCityBundle({ flights, totalPrice, combinedBookingUrl, legOptions, optionsLoading }: MultiCityBundleProps) {
  if (flights.length === 0) return null;
  const route = [flights[0].departureAirport, ...flights.map((f) => f.arrivalAirport)].join(' → ');

  return (
    <div className="rounded-2xl border p-6 sm:p-8 relative overflow-hidden bg-surface-2 border-hairline-strong">
      <div className="flex items-center justify-between mb-5">
        <span className="text-eyebrow text-brand-400">MULTI-CITY · {flights.length} FLIGHTS</span>
        <span className="text-h2 text-[0.95rem] text-ink-muted font-mono">{route}</span>
      </div>

      <div className="flex items-baseline justify-between gap-4 mb-1">
        <span className="text-display tabular-nums text-ink">${totalPrice.toFixed(0)}</span>
      </div>
      <div className="text-xs text-ink-faint mb-6">
        Prices as of {formatScrapedAt(flights[0].scrapedAt)} — live prices may have changed
      </div>

      <div className="divide-y divide-hairline -mx-2">
        {flights.map((flight, i) => (
          <LegRow
            key={flight.id}
            flight={flight}
            legNumber={i + 1}
            options={legOptions[i] ?? null}
            loading={optionsLoading}
          />
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={() => combinedBookingUrl && window.open(combinedBookingUrl, '_blank', 'noopener,noreferrer')}
          disabled={!combinedBookingUrl}
          className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-all duration-150 hover:-translate-y-px hover:scale-[1.015] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
        >
          Book all flights on Google Flights →
        </button>
        <div className="text-center text-xs text-ink-faint mt-2">
          {combinedBookingUrl ? 'All flights pre-selected — no extra steps' : 'Combined link unavailable for this itinerary'}
        </div>
      </div>
    </div>
  );
}
