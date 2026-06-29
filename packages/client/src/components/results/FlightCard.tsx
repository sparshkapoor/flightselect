import type { Flight, BookingOption } from '@flightselect/shared';
import { PriceTag } from './PriceTag';
import { FlightTimeline } from './FlightTimeline';
import { CABIN_CLASS_LABELS } from '../../utils/constants';
import { useBookingOptions } from '../../hooks/useBookingOptions';
import { airlineInitials, airlineColor } from '../../utils/airlineBadge';

interface FlightCardProps {
  flight: Flight;
  selected?: boolean;
  onSelect?: (flight: Flight) => void;
  /** 'lazy' (default): click-to-fetch sellers, Google Flights link leads.
   *  'eager': sellers are supplied by the parent (already batch-fetched) and lead;
   *  Google Flights demoted to a fallback. */
  mode?: 'lazy' | 'eager';
  /** Required when mode === 'eager' — fetched once for the whole view by the parent. */
  eagerOptions?: BookingOption[] | null;
  eagerLoading?: boolean;
}

export function FlightCard({
  flight,
  selected,
  onSelect,
  mode = 'lazy',
  eagerOptions = null,
  eagerLoading = false,
}: FlightCardProps) {
  const eager = mode === 'eager';
  const lazy = useBookingOptions(flight.id);
  const bookingOptions = eager ? eagerOptions : lazy.options;
  const loadingOptions = eager ? eagerLoading : lazy.loading;
  const optionsError = eager ? null : lazy.error;
  const fetchNow = lazy.fetchNow;

  const handleBookingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flight.bookingUrl) {
      window.open(flight.bookingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchNow();
  };

  return (
    <div
      className={`card flex items-start gap-5 px-5 py-4 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-brand-500 shadow-md' : 'hover:shadow-md hover:border-gray-300'
      }`}
      onClick={() => onSelect?.(flight)}
    >
      {/* Airline badge */}
      <div className="flex flex-col items-center gap-1 w-16 shrink-0 pt-0.5">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${airlineColor(flight.airline)}`}
        >
          {airlineInitials(flight.airline)}
        </div>
        <div className="text-xs font-semibold text-gray-700 text-center leading-tight truncate w-full">
          {flight.airline.split(' ')[0]}
        </div>
        <div className="text-xs text-gray-400">{flight.flightNumber}</div>
      </div>

      {/* Timeline */}
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

      {/* Price + actions */}
      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
        <PriceTag amount={Number(flight.price)} currency={flight.currency} />
        <div className="text-xs text-gray-400">{CABIN_CLASS_LABELS[flight.cabinClass]} · one-way</div>

        {eager ? (
          <div className="mt-1.5 w-full">
            {loadingOptions ? (
              <div className="space-y-1.5">
                <div className="h-7 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : bookingOptions !== null && bookingOptions.length > 0 ? (
              <div className="space-y-1 text-left">
                {bookingOptions.map((opt, i) => (
                  <a
                    key={i}
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm py-2 rounded-lg transition-colors duration-150"
                  >
                    Book on {opt.seller} →
                  </a>
                ))}
                <button
                  onClick={handleBookingClick}
                  className="block w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-1.5 underline-offset-2 hover:underline"
                >
                  Or check Google Flights
                </button>
              </div>
            ) : (
              <button
                onClick={handleBookingClick}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold hover:underline"
              >
                Book on Google Flights →
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={handleBookingClick}
              className="mt-1.5 text-xs text-brand-600 hover:text-brand-800 font-semibold hover:underline"
            >
              Book on Google Flights →
            </button>
            <button
              onClick={handleViewOptions}
              disabled={loadingOptions || (bookingOptions !== null && bookingOptions.length > 0)}
              className="mt-1 text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
            >
              {loadingOptions
                ? 'Loading...'
                : bookingOptions !== null && bookingOptions.length > 0
                ? 'Sellers loaded'
                : bookingOptions !== null && bookingOptions.length === 0
                ? 'No sellers found'
                : 'View booking options'}
            </button>
            {bookingOptions !== null && bookingOptions.length > 0 && (
              <div className="mt-1.5 space-y-1 text-left">
                {bookingOptions.map((opt, i) => (
                  <a
                    key={i}
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex justify-between items-center text-xs text-brand-700 hover:underline"
                  >
                    <span>{opt.seller}</span>
                    <span className="ml-2 font-semibold">${opt.price}</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
        {optionsError && (
          <div className="mt-1 text-xs text-gray-400">{optionsError}</div>
        )}
      </div>
    </div>
  );
}
