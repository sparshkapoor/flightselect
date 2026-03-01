import { useFilterStore } from '../../stores/filterStore';
import type { Flight } from '@flightselect/shared';

interface FilterSidebarProps {
  flights: Flight[];
}

export function FilterSidebar({ flights }: FilterSidebarProps) {
  const store = useFilterStore();
  const airlines = [...new Set(flights.map((f) => f.airline))].sort();
  const prices = flights.map((f) => Number(f.price));
  const maxFlightPrice = Math.max(...prices, 0);
  const minFlightPrice = Math.min(...prices, 0);

  return (
    <div className="card space-y-5 w-64 shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Filters</h3>
        <button
          type="button"
          className="text-xs text-brand-600 hover:text-brand-700"
          onClick={store.reset}
        >
          Reset all
        </button>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Price: {store.maxPrice ? `$${store.maxPrice}` : 'Any'}
        </label>
        <input
          type="range"
          min={minFlightPrice}
          max={maxFlightPrice}
          step={10}
          value={store.maxPrice ?? maxFlightPrice}
          onChange={(e) => store.setMaxPrice(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>${minFlightPrice}</span>
          <span>${maxFlightPrice}</span>
        </div>
      </div>

      {/* Layovers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Max Layovers</label>
        <div className="flex gap-2">
          {[undefined, 0, 1, 2].map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                store.maxLayovers === v
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
              onClick={() => store.setMaxLayovers(v)}
            >
              {v === undefined ? 'Any' : v === 0 ? 'Direct' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Max Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Flight Duration: {store.maxDurationMinutes ? `${Math.floor(store.maxDurationMinutes / 60)}h ${store.maxDurationMinutes % 60}m` : 'Any'}
        </label>
        <input
          type="range"
          min={60}
          max={1440}
          step={30}
          value={store.maxDurationMinutes ?? 1440}
          onChange={(e) => {
            const v = Number(e.target.value);
            store.setMaxDurationMinutes(v === 1440 ? undefined : v);
          }}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1h</span>
          <span>24h</span>
        </div>
      </div>

      {/* Departure time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Departure Time</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={store.departureTimeStart ?? ''}
            onChange={(e) => store.setDepartureTimeStart(e.target.value || undefined)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="time"
            value={store.departureTimeEnd ?? ''}
            onChange={(e) => store.setDepartureTimeEnd(e.target.value || undefined)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
          />
        </div>
      </div>

      {/* Airlines */}
      {airlines.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Airlines</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {airlines.map((airline) => (
              <label key={airline} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.selectedAirlines.includes(airline)}
                  onChange={(e) =>
                    store.setSelectedAirlines(
                      e.target.checked
                        ? [...store.selectedAirlines, airline]
                        : store.selectedAirlines.filter((a) => a !== airline)
                    )
                  }
                  className="rounded accent-brand-600"
                />
                <span className="text-sm text-gray-700">{airline}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
