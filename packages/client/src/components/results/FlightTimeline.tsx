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
    <div className="flex-1 min-w-0">
      {/* Row 1: times + duration */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-lg font-bold text-gray-900 tabular-nums shrink-0">
          {formatTime(departureTime)}
        </div>
        <div className="text-xs text-gray-400 font-medium">{durationStr}</div>
        <div className="text-lg font-bold text-gray-900 tabular-nums shrink-0">
          {formatTime(arrivalTime)}
        </div>
      </div>

      {/* Row 2: airports + connecting line */}
      <div className="flex items-center gap-1.5 my-1.5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
          {departureAirport}
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
          <div className="flex-1 h-px bg-gray-300" />
          {isLayover && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <div className="flex-1 h-px bg-gray-300" />
            </>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
        </div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
          {arrivalAirport}
        </div>
      </div>

      {/* Row 3: stop badge */}
      <div className="flex justify-center">
        <LayoverBadge
          isLayover={isLayover}
          layoverAirport={layoverAirport}
          layoverDurationMinutes={layoverDurationMinutes}
        />
      </div>
    </div>
  );
}
