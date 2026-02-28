import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatPrice } from '../../utils/formatters';

interface PriceComparisonChartProps {
  roundTripTotal: number;
  oneWayTotal: number;
  currency?: string;
}

export function PriceComparisonChart({ roundTripTotal, oneWayTotal, currency = 'USD' }: PriceComparisonChartProps) {
  const data = [
    { name: 'Round Trip', price: roundTripTotal },
    { name: 'One-Way Combo', price: oneWayTotal },
  ];

  const minPrice = Math.min(roundTripTotal, oneWayTotal);

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => formatPrice(v, currency)}
            tick={{ fontSize: 11 }}
            width={80}
          />
          <Tooltip formatter={(v: number) => formatPrice(v, currency)} />
          <Bar dataKey="price" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.price === minPrice ? '#16a34a' : '#3b82f6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
