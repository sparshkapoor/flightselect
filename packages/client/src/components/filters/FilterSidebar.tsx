import { useMemo } from 'react';
import { useFilterStore } from '../../stores/filterStore';
import type { Flight } from '@flightselect/shared';

interface FilterSidebarProps {
  flights: Flight[];
}

export function FilterSidebar({ flights }: FilterSidebarProps) {
  const store = useFilterStore();

  const { airlines, maxFlightPrice, minFlightPrice } = useMemo(() => {
    const airlines = [...new Set(flights.map((f) => f.airline))].sort();
    const prices = flights.map((f) => Number(f.price));
    return {
      airlines,
      maxFlightPrice: prices.length ? Math.ceil(Math.max(...prices)) : 1000,
      minFlightPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
    };
  }, [flights]);

  return (
    <div className="card self-start sticky top-20 space-y-4 w-64 shrink-0 divide-y divide-hairline">
      <div className="flex items-center justify-between">
        <h3 className="text-h2 text-[1rem] text-ink">Filters</h3>
        <button
          type="button"
          className="text-xs font-medium text-brand-400 hover:text-brand-300"
          onClick={store.reset}
        >
          Reset all
        </button>
      </div>

      {/* Price range */}
      <div className="pt-4">
        <label className="text-eyebrow text-ink-subtle mb-2 block">
          Max Price: {store.maxPrice !== undefined ? `$${store.maxPrice}` : 'Any'}
        </label>
        <input
          type="range"
          min={minFlightPrice}
          max={maxFlightPrice}
          step={10}
          value={store.maxPrice !== undefined ? Math.min(store.maxPrice, maxFlightPrice) : maxFlightPrice}
          onChange={(e) => {
            const v = Number(e.target.value);
            store.setMaxPrice(v >= maxFlightPrice ? undefined : v);
          }}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs font-mono text-ink-faint mt-1">
          <span>${minFlightPrice}</span>
          <span>${maxFlightPrice}</span>
        </div>
      </div>

      {/* Layovers */}
      <div className="pt-4">
        <label className="text-eyebrow text-ink-subtle mb-2 block">Stops</label>
        <div className="flex gap-2">
          {[undefined, 0, 1, 2].map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`px-2.5 py-1 rounded-md text-xs border transition-all duration-150 ${
                store.maxLayovers === v
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-surface-1 text-ink-subtle border-hairline hover:border-hairline-strong'
              }`}
              onClick={() => store.setMaxLayovers(v)}
            >
              {v === undefined ? 'Any' : v === 0 ? 'Direct' : `${v}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Max Duration */}
      <div className="pt-4">
        <label className="text-eyebrow text-ink-subtle mb-2 block">
          Max Duration: {store.maxDurationMinutes ? `${Math.floor(store.maxDurationMinutes / 60)}h ${store.maxDurationMinutes % 60}m` : 'Any'}
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
        <div className="flex justify-between text-xs font-mono text-ink-faint mt-1">
          <span>1h</span>
          <span>24h</span>
        </div>
      </div>

      {/* Departure time */}
      <div className="pt-4">
        <label className="text-eyebrow text-ink-subtle mb-2 block">Departure Time</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={store.departureTimeStart ?? ''}
            onChange={(e) => store.setDepartureTimeStart(e.target.value || undefined)}
            className="flex-1 text-xs font-mono border border-hairline bg-surface-1 text-ink rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <span className="text-xs text-ink-faint">to</span>
          <input
            type="time"
            value={store.departureTimeEnd ?? ''}
            onChange={(e) => store.setDepartureTimeEnd(e.target.value || undefined)}
            className="flex-1 text-xs font-mono border border-hairline bg-surface-1 text-ink rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
      </div>

      {/* Airlines */}
      {airlines.length > 0 && (
        <div className="pt-4 pb-1">
          <label className="text-eyebrow text-ink-subtle mb-2 block">Airlines</label>
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
                <span className="text-sm text-ink-muted">{airline}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
