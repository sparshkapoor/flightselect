import { RecommendedOption } from '@flightselect/shared';
import { formatPriceDifference } from '../../utils/formatters';

interface SavingsBadgeProps {
  priceDifference: number;
  recommendedOption: RecommendedOption;
}

export function SavingsBadge({ priceDifference, recommendedOption }: SavingsBadgeProps) {
  const savings = Math.abs(priceDifference);
  const label =
    recommendedOption === RecommendedOption.ROUND_TRIP
      ? 'Same Airline saves'
      : recommendedOption === RecommendedOption.ONE_WAY
      ? 'Mix & Match saves'
      : 'Mixed strategy saves';

  return (
    <div className="flex flex-col items-center gap-1 bg-green-50 border border-green-200 rounded-xl p-4">
      <span className="text-xs font-medium text-green-700 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-green-700">{formatPriceDifference(savings)}</span>
      <span className="text-xs text-green-600">vs. the other option</span>
    </div>
  );
}
