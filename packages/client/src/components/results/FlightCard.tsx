import { useState } from 'react';
import type { Flight, BookingOption } from '@flightselect/shared';
import { PriceTag } from './PriceTag';
import { FlightTimeline } from './FlightTimeline';
import { CABIN_CLASS_LABELS } from '../../utils/constants';

interface FlightCardProps {
  flight: Flight;
  selected?: boolean;
  onSelect?: (flight: Flight) => void;
}

const FIRST_LETTER_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-indigo-100 text-indigo-700',
  C: 'bg-cyan-100 text-cyan-700',
  D: 'bg-sky-100 text-sky-700',
  E: 'bg-green-100 text-green-700',
  F: 'bg-teal-100 text-teal-700',
  J: 'bg-amber-100 text-amber-700',
  S: 'bg-rose-100 text-rose-700',
  U: 'bg-purple-100 text-purple-700',
};

function airlineInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function airlineColor(name: string): string {
  const key = name[0]?.toUpperCase() ?? '';
  return FIRST_LETTER_COLORS[key] ?? 'bg-brand-100 text-brand-700';
}

export function FlightCard({ flight, selected, onSelect }: FlightCardProps) {
  const [bookingOptions, setBookingOptions] = useState<BookingOption[] | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const handleBookingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flight.bookingUrl) {
      window.open(flight.bookingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewOptions = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookingOptions !== null) return;
    setLoadingOptions(true);
    setOptionsError(null);
    try {
      const res = await fetch(`/api/flights/${flight.id}/booking-options`);
      const data = await res.json();
      setBookingOptions(data.options ?? []);
      if (data.message && !data.options?.length) setOptionsError(data.message);
    } catch {
      setOptionsError('Failed to load booking options');
    } finally {
      setLoadingOptions(false);
    }
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
        <div className="text-xs text-gray-400">{CABIN_CLASS_LABELS[flight.cabinClass]}</div>
        {flight.bookingUrl && (
          <button
            onClick={handleBookingClick}
            className="mt-1.5 text-xs text-brand-600 hover:text-brand-800 font-semibold hover:underline"
          >
            Book on Google Flights →
          </button>
        )}
        <button
          onClick={handleViewOptions}
          disabled={loadingOptions}
          className="mt-1 text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
        >
          {loadingOptions ? 'Loading...' : bookingOptions !== null ? 'Sellers loaded' : 'View booking options'}
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
        {optionsError && (
          <div className="mt-1 text-xs text-gray-400">{optionsError}</div>
        )}
      </div>
    </div>
  );
}
