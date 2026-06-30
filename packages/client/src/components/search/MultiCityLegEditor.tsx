import { AirportInput } from './AirportInput';
import { DatePicker } from './DatePicker';
import type { SearchLegDraft } from '../../stores/searchStore';

interface MultiCityLegEditorProps {
  legs: SearchLegDraft[];
  onUpdateLeg: (index: number, patch: Partial<SearchLegDraft>) => void;
  onAddLeg: () => void;
  onRemoveLeg: (index: number) => void;
}

const MAX_LEGS = 6;

export function MultiCityLegEditor({ legs, onUpdateLeg, onAddLeg, onRemoveLeg }: MultiCityLegEditorProps) {
  return (
    <div className="space-y-4">
      {legs.map((leg, i) => (
        <div key={i} className="rounded-xl border border-hairline bg-surface-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-eyebrow text-ink-faint">Flight {i + 1}</span>
            {legs.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveLeg(i)}
                className="text-xs text-ink-faint hover:text-red-400 transition-colors duration-150"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AirportInput
              label="From"
              value={leg.originAirport}
              onChange={(v) => onUpdateLeg(i, { originAirport: v })}
              placeholder="Origin airport"
            />
            <AirportInput
              label="To"
              value={leg.destinationAirport}
              onChange={(v) => onUpdateLeg(i, { destinationAirport: v })}
              placeholder="Destination airport"
            />
          </div>
          <DatePicker
            label="Departure"
            value={leg.departureDate}
            onChange={(v) => onUpdateLeg(i, { departureDate: v })}
            min={i > 0 ? legs[i - 1].departureDate : undefined}
            required
          />
        </div>
      ))}
      {legs.length < MAX_LEGS && (
        <button
          type="button"
          onClick={onAddLeg}
          className="text-sm text-brand-400 hover:text-brand-300 font-medium hover:underline"
        >
          + Add another flight
        </button>
      )}
    </div>
  );
}
