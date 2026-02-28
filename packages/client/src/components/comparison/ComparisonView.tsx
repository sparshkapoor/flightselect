import type { Comparison, Flight } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';
import { PriceTag } from '../results/PriceTag';
import { FlightCard } from '../results/FlightCard';
import { SavingsBadge } from './SavingsBadge';
import { PriceComparisonChart } from './PriceComparisonChart';
import { ComparisonTable } from './ComparisonTable';
import { AIInsightsPanel } from './AIInsightsPanel';

interface ComparisonViewProps {
  comparison: Comparison;
  roundTripFlights: Flight[];
  oneWayOutboundFlights: Flight[];
  oneWayReturnFlights: Flight[];
}

const RECOMMENDATION_LABELS: Record<RecommendedOption, string> = {
  [RecommendedOption.ROUND_TRIP]: '✈ Book Round Trip',
  [RecommendedOption.ONE_WAY]: '🔀 Book Two One-Ways',
  [RecommendedOption.MIXED]: '🔄 Mixed Strategy',
};

export function ComparisonView({
  comparison,
  roundTripFlights,
  oneWayOutboundFlights,
  oneWayReturnFlights,
}: ComparisonViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Round Trip vs. One-Way</h2>
        <span className="bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full font-semibold text-sm">
          {RECOMMENDATION_LABELS[comparison.recommendedOption]}
        </span>
      </div>

      {/* Price overview cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`card text-center ${comparison.recommendedOption === RecommendedOption.ROUND_TRIP ? 'ring-2 ring-green-400' : ''}`}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Best Round Trip
          </div>
          <PriceTag
            amount={Number(comparison.roundTripTotalPrice)}
            size="lg"
            highlight={comparison.recommendedOption === RecommendedOption.ROUND_TRIP}
          />
          {roundTripFlights[0] && (
            <div className="text-xs text-gray-400 mt-1">{roundTripFlights[0].airline}</div>
          )}
        </div>

        <SavingsBadge
          priceDifference={Number(comparison.priceDifference)}
          recommendedOption={comparison.recommendedOption}
        />

        <div className={`card text-center ${comparison.recommendedOption === RecommendedOption.ONE_WAY ? 'ring-2 ring-green-400' : ''}`}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Best One-Way Combo
          </div>
          <PriceTag
            amount={Number(comparison.oneWayTotalPrice)}
            size="lg"
            highlight={comparison.recommendedOption === RecommendedOption.ONE_WAY}
          />
          {oneWayOutboundFlights[0] && oneWayReturnFlights[0] && (
            <div className="text-xs text-gray-400 mt-1">
              {oneWayOutboundFlights[0].airline} + {oneWayReturnFlights[0].airline}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Price Comparison</h3>
        <PriceComparisonChart
          roundTripTotal={Number(comparison.roundTripTotalPrice)}
          oneWayTotal={Number(comparison.oneWayTotalPrice)}
        />
      </div>

      {/* Comparison table */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Detailed Comparison</h3>
        <ComparisonTable
          roundTripFlights={roundTripFlights}
          oneWayOutboundFlights={oneWayOutboundFlights}
          oneWayReturnFlights={oneWayReturnFlights}
          roundTripTotal={Number(comparison.roundTripTotalPrice)}
          oneWayTotal={Number(comparison.oneWayTotalPrice)}
        />
      </div>

      {/* Flight details */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Round-Trip Flights</h3>
          <div className="space-y-2">
            {roundTripFlights.map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">One-Way Options</h3>
          <div className="space-y-2">
            {[...oneWayOutboundFlights, ...oneWayReturnFlights].map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel aiAnalysis={comparison.aiAnalysis} />
    </div>
  );
}
