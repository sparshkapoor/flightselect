import { formatDurationMinutes } from '../../utils/formatters';

interface LayoverBadgeProps {
  isLayover: boolean;
  layoverAirport?: string | null;
  layoverDurationMinutes?: number | null;
}

export function LayoverBadge({ isLayover, layoverAirport, layoverDurationMinutes }: LayoverBadgeProps) {
  if (!isLayover) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Direct
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      {layoverAirport && `via ${layoverAirport}`}
      {layoverDurationMinutes && ` · ${formatDurationMinutes(layoverDurationMinutes)}`}
    </span>
  );
}
