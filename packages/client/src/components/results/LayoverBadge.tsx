import { formatDurationMinutes } from '../../utils/formatters';

interface LayoverBadgeProps {
  isLayover: boolean;
  layoverAirport?: string | null;
  layoverDurationMinutes?: number | null;
}

export function LayoverBadge({ isLayover, layoverAirport, layoverDurationMinutes }: LayoverBadgeProps) {
  if (!isLayover) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        Direct
      </span>
    );
  }

  const parts: string[] = [];
  if (layoverAirport) parts.push(`via ${layoverAirport}`);
  if (layoverDurationMinutes) parts.push(formatDurationMinutes(layoverDurationMinutes));
  const label = parts.length > 0 ? parts.join(' · ') : '1 stop';

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      {label}
    </span>
  );
}
