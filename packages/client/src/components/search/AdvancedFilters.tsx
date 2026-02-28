import { useState } from 'react';

interface AdvancedFiltersProps {
  maxLayovers: number | undefined;
  onMaxLayoversChange: (v: number | undefined) => void;
  flexibleDates: boolean;
  onFlexibleDatesChange: (v: boolean) => void;
  flexibleDateRangeDays: number | undefined;
  onFlexibleDateRangeDaysChange: (v: number | undefined) => void;
  preferredAirlines: string[];
  avoidedAirlines: string[];
  onPreferredAirlinesChange: (v: string[]) => void;
  onAvoidedAirlinesChange: (v: string[]) => void;
}

const AIRLINES = [
  'Delta', 'United', 'American', 'Southwest', 'JetBlue', 'Alaska',
  'Spirit', 'Frontier', 'British Airways', 'Lufthansa', 'ANA', 'JAL',
  'Emirates', 'Singapore Airlines', 'Air France',
];

export function AdvancedFilters({
  maxLayovers,
  onMaxLayoversChange,
  flexibleDates,
  onFlexibleDatesChange,
  flexibleDateRangeDays,
  onFlexibleDateRangeDaysChange,
  preferredAirlines,
  avoidedAirlines,
  onPreferredAirlinesChange,
  onAvoidedAirlinesChange,
}: AdvancedFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        Advanced Filters
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Max Layovers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Layovers</label>
            <div className="flex gap-2">
              {[undefined, 0, 1, 2].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    maxLayovers === v
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                  }`}
                  onClick={() => onMaxLayoversChange(v)}
                >
                  {v === undefined ? 'Any' : v === 0 ? 'Direct' : v}
                </button>
              ))}
            </div>
          </div>

          {/* Flexible dates */}
          <div className="flex items-center gap-3">
            <input
              id="flexDates"
              type="checkbox"
              checked={flexibleDates}
              onChange={(e) => onFlexibleDatesChange(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="flexDates" className="text-sm font-medium text-gray-700">
              Flexible dates
            </label>
            {flexibleDates && (
              <select
                value={flexibleDateRangeDays ?? 3}
                onChange={(e) => onFlexibleDateRangeDaysChange(Number(e.target.value))}
                className="ml-2 input-field w-auto text-sm"
              >
                {[1, 2, 3, 5, 7].map((d) => (
                  <option key={d} value={d}>
                    ±{d} day{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preferred airlines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Airlines</label>
            <div className="flex flex-wrap gap-2">
              {AIRLINES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    onPreferredAirlinesChange(
                      preferredAirlines.includes(a)
                        ? preferredAirlines.filter((x) => x !== a)
                        : [...preferredAirlines, a]
                    )
                  }
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    preferredAirlines.includes(a)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Avoided airlines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avoid Airlines</label>
            <div className="flex flex-wrap gap-2">
              {AIRLINES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    onAvoidedAirlinesChange(
                      avoidedAirlines.includes(a)
                        ? avoidedAirlines.filter((x) => x !== a)
                        : [...avoidedAirlines, a]
                    )
                  }
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    avoidedAirlines.includes(a)
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-red-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
