import { formatDurationMinutes } from '../../utils/formatters';

interface LayoverBadgeProps {
  isLayover: boolean;
  layoverAirport?: string | null;
  layoverDurationMinutes?: number | null;
}

export function LayoverBadge({ isLayover, layoverAirport, layoverDurationMinutes }: LayoverBadgeProps) {
  if (!isLayover) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Direct
      </span>
    );
  }

  const parts: string[] = [];
  if (layoverAirport) parts.push(`via ${layoverAirport}`);
  if (layoverDurationMinutes) parts.push(formatDurationMinutes(layoverDurationMinutes));
  const label = parts.length > 0 ? parts.join(' · ') : '1 stop';

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      {label}
    </span>
  );
}
