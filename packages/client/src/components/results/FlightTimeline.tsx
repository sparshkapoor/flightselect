import { formatTime } from '../../utils/formatters';
import { LayoverBadge } from './LayoverBadge';

interface FlightTimelineProps {
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  durationMinutes: number;
  isLayover: boolean;
  layoverAirport?: string | null;
  layoverDurationMinutes?: number | null;
}

export function FlightTimeline({
  departureTime,
  arrivalTime,
  departureAirport,
  arrivalAirport,
  durationMinutes,
  isLayover,
  layoverAirport,
  layoverDurationMinutes,
}: FlightTimelineProps) {
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="text-center">
        <div className="text-lg font-bold">{formatTime(departureTime)}</div>
        <div className="text-xs font-semibold text-gray-500">{departureAirport}</div>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="text-xs text-gray-400">{durationStr}</div>
        <div className="w-full flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <div className="flex-1 h-0.5 bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        </div>
        <LayoverBadge isLayover={isLayover} layoverAirport={layoverAirport} layoverDurationMinutes={layoverDurationMinutes} />
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{formatTime(arrivalTime)}</div>
        <div className="text-xs font-semibold text-gray-500">{arrivalAirport}</div>
      </div>
    </div>
  );
}
