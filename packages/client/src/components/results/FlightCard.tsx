import type { Flight } from '@flightselect/shared';
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
  const handleBookingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flight.bookingUrl) {
      window.open(flight.bookingUrl, '_blank', 'noopener,noreferrer');
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
      </div>
    </div>
  );
}
