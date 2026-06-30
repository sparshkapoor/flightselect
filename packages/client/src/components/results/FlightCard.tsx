import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Flight, BookingOption } from '@flightselect/shared';
import { PriceTag } from './PriceTag';
import { FlightTimeline } from './FlightTimeline';
import { CABIN_CLASS_LABELS } from '../../utils/constants';
import { useBookingOptions } from '../../hooks/useBookingOptions';
import { airlineInitials, airlineColor } from '../../utils/airlineBadge';
import { formatTime } from '../../utils/formatters';

interface FlightCardProps {
  flight: Flight;
  selected?: boolean;
  onSelect?: (flight: Flight) => void;
  mode?: 'lazy' | 'eager';
  eagerOptions?: BookingOption[] | null;
  eagerLoading?: boolean;
  eagerMessage?: string;
  tiedCount?: number;
}

function BookingOptionsModal({
  flight,
  options,
  googleFlightsUrl,
  onClose,
}: {
  flight: Flight;
  options: BookingOption[];
  googleFlightsUrl?: string;
  onClose: () => void;
}) {
  const sorted = [...options].sort((a, b) => a.price - b.price);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-1 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-hairline">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">
                {flight.departureAirport} → {flight.arrivalAirport}
              </div>
              <div className="text-xs text-ink-faint mt-0.5">
                {flight.airline} · {formatTime(flight.departureTime)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold font-mono text-ink">
                ${Number(flight.price).toFixed(0)}
              </div>
              <div className="text-xs text-ink-faint">lowest seen</div>
            </div>
          </div>
        </div>

        {/* Options list */}
        <div className="px-3 py-2 max-h-72 overflow-y-auto">
          {sorted.map((opt, i) => (
            <a
              key={i}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors group"
            >
              <span className="text-sm font-medium text-ink group-hover:text-brand-300 transition-colors">
                {opt.seller}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold font-mono text-ink">
                  ${opt.price}
                </span>
                <span className="text-xs text-brand-400 group-hover:text-brand-300 font-medium">
                  Book →
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between gap-3">
          {googleFlightsUrl ? (
            <a
              href={googleFlightsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink-faint hover:text-ink-cool hover:underline underline-offset-2"
            >
              Or check Google Flights
            </a>
          ) : <span />}
          <button
            onClick={onClose}
            className="text-xs text-ink-faint hover:text-ink transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FlightCard({
  flight,
  selected,
  onSelect,
  mode = 'lazy',
  eagerOptions = null,
  eagerLoading = false,
  eagerMessage,
  tiedCount = 0,
}: FlightCardProps) {
  const [showModal, setShowModal] = useState(false);
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

  const primaryOption = bookingOptions?.[0] ?? null;
  const hasOptions = bookingOptions !== null && bookingOptions.length > 0;

  return (
    <>
      <div
        className={`card flex items-start gap-5 px-5 py-4 cursor-pointer ${
          selected ? 'ring-2 ring-brand-500' : 'card-hover'
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
          <div className="text-xs font-semibold text-ink-muted text-center leading-tight truncate w-full">
            {flight.airline.split(' ')[0]}
          </div>
          <div className="text-xs font-mono text-ink-faint">{flight.flightNumber}</div>
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
        <div className="text-right shrink-0 max-w-[40%] flex flex-col items-end gap-0.5">
          <PriceTag amount={Number(flight.price)} currency={flight.currency} />
          <div className="text-xs text-ink-faint">{CABIN_CLASS_LABELS[flight.cabinClass]} · one-way</div>
          {tiedCount > 0 && (
            <div className="text-[0.6875rem] text-ink-faint">+{tiedCount} more at this price</div>
          )}

          {eager ? (
            <div className="mt-1.5 w-full space-y-1.5">
              {loadingOptions && (
                <div className="text-xs text-ink-faint text-right">Checking sellers...</div>
              )}
              {hasOptions && primaryOption && (
                <>
                  <a
                    href={primaryOption.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all duration-150 hover:-translate-y-px hover:scale-[1.015]"
                  >
                    Book on {primaryOption.seller} →
                  </a>
                  {bookingOptions!.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                      className="block w-full text-center text-xs text-ink-faint hover:text-ink-cool underline-offset-2 hover:underline"
                    >
                      +{bookingOptions!.length - 1} more options
                    </button>
                  )}
                </>
              )}
              {!loadingOptions && bookingOptions !== null && !hasOptions && (
                <div className="text-xs text-ink-faint whitespace-normal text-right">
                  {eagerMessage ?? 'No sellers found'}
                </div>
              )}
              <button
                onClick={handleBookingClick}
                className="block w-full text-center text-xs text-ink-faint hover:text-ink-cool underline-offset-2 hover:underline"
              >
                Or check Google Flights
              </button>
            </div>
          ) : (
            <div className="mt-1.5 w-full space-y-1.5 flex flex-col items-end">
              {bookingOptions === null && (
                <button
                  onClick={handleViewOptions}
                  disabled={loadingOptions}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold hover:underline disabled:opacity-50"
                >
                  {loadingOptions ? 'Checking sellers...' : 'View booking options'}
                </button>
              )}
              {bookingOptions !== null && !hasOptions && (
                <div className="text-xs text-ink-faint">
                  {optionsError ? 'Error checking sellers' : 'No sellers found'}
                </div>
              )}
              {hasOptions && primaryOption && (
                <>
                  <a
                    href={primaryOption.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all duration-150 hover:-translate-y-px hover:scale-[1.015]"
                  >
                    Book on {primaryOption.seller} →
                  </a>
                  {bookingOptions!.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                      className="text-xs text-ink-faint hover:text-ink-cool underline-offset-2 hover:underline"
                    >
                      +{bookingOptions!.length - 1} more options
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleBookingClick}
                className="text-xs text-ink-faint hover:text-ink-cool hover:underline"
              >
                Or check Google Flights
              </button>
              {optionsError && (
                <div className="text-xs text-ink-faint whitespace-normal text-right">{optionsError}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && bookingOptions && (
        <BookingOptionsModal
          flight={flight}
          options={bookingOptions}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
