import type { Flight } from '@flightselect/shared';
import { formatPrice, formatDurationMinutes } from '../../utils/formatters';

interface ComparisonTableProps {
  roundTripFlights: Flight[];
  oneWayOutboundFlights: Flight[];
  oneWayReturnFlights: Flight[];
  roundTripTotal: number;
  oneWayTotal: number;
}

export function ComparisonTable({
  roundTripFlights,
  oneWayOutboundFlights,
  oneWayReturnFlights,
  roundTripTotal,
  oneWayTotal,
}: ComparisonTableProps) {
  const rtAvgDuration =
    roundTripFlights.length > 0
      ? Math.round(roundTripFlights.reduce((s, f) => s + f.durationMinutes, 0) / roundTripFlights.length)
      : 0;
  const owAvgDuration =
    [...oneWayOutboundFlights, ...oneWayReturnFlights].length > 0
      ? Math.round(
          [...oneWayOutboundFlights, ...oneWayReturnFlights].reduce(
            (s, f) => s + f.durationMinutes,
            0
          ) / [...oneWayOutboundFlights, ...oneWayReturnFlights].length
        )
      : 0;

  const rows = [
    {
      label: 'Total Price',
      rt: formatPrice(roundTripTotal),
      ow: formatPrice(oneWayTotal),
      highlight: true,
    },
    { label: 'Avg. Duration', rt: formatDurationMinutes(rtAvgDuration), ow: formatDurationMinutes(owAvgDuration) },
    {
      label: 'Layovers',
      rt: roundTripFlights.filter((f) => f.isLayover).length.toString(),
      ow: [...oneWayOutboundFlights, ...oneWayReturnFlights]
        .filter((f) => f.isLayover)
        .length.toString(),
    },
    {
      label: 'Airlines',
      rt: [...new Set(roundTripFlights.map((f) => f.airline))].join(', ') || '—',
      ow:
        [...new Set([...oneWayOutboundFlights, ...oneWayReturnFlights].map((f) => f.airline))].join(
          ', '
        ) || '—',
    },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase text-gray-400 border-b">
          <th className="text-left py-2">Attribute</th>
          <th className="text-center py-2">Round Trip</th>
          <th className="text-center py-2">One-Way Combo</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={`border-b ${row.highlight ? 'font-semibold' : ''}`}>
            <td className="py-2 text-gray-600">{row.label}</td>
            <td className="py-2 text-center">{row.rt}</td>
            <td className="py-2 text-center">{row.ow}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
