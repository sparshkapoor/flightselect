import type { Flight } from '@flightselect/shared';
import { PriceTag } from './PriceTag';
import { FlightTimeline } from './FlightTimeline';
import { CABIN_CLASS_LABELS } from '../../utils/constants';

interface FlightCardProps {
  flight: Flight;
  selected?: boolean;
  onSelect?: (flight: Flight) => void;
}

export function FlightCard({ flight, selected, onSelect }: FlightCardProps) {
  return (
    <div
      className={`card flex items-center gap-4 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-brand-500' : 'hover:shadow-md'
      }`}
      onClick={() => onSelect?.(flight)}
    >
      <div className="w-24 text-center">
        <div className="font-bold text-gray-800">{flight.airline.split(' ')[0]}</div>
        <div className="text-xs text-gray-400">{flight.flightNumber}</div>
        <div className="text-xs text-gray-400 mt-0.5">{CABIN_CLASS_LABELS[flight.cabinClass]}</div>
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
      <div className="text-right">
        <PriceTag amount={Number(flight.price)} currency={flight.currency} />
        <div className="text-xs text-gray-400 mt-0.5">per person</div>
      </div>
    </div>
  );
}
