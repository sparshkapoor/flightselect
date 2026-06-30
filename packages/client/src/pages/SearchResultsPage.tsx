import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchResults, useFlights, useComparisons } from '../hooks/useSearch';
import { useFilterStore, type FilterState } from '../stores/filterStore';
import { FilterSidebar } from '../components/filters/FilterSidebar';
import { ResultsContainer } from '../components/results/ResultsContainer';
import { ComparisonView } from '../components/comparison/ComparisonView';
import { MultiCityBundle } from '../components/comparison/MultiCityBundle';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { splitFlightsByDirection, computeFilteredComparison } from '../utils/flightComparison';
import { useMultiCityBookingUrl } from '../hooks/useMultiCityBookingUrl';
import { useBatchBookingOptions } from '../hooks/useBatchBookingOptions';
import type { Flight } from '@flightselect/shared';
import { TripType } from '@flightselect/shared';

export type SortOption = 'price_asc' | 'price_desc' | 'duration_asc' | 'departure_asc';

function applyFiltersAndSortFor(
  flights: Flight[],
  filterStore: FilterState,
  sortBy: SortOption
): Flight[] {
  const filtered = flights.filter((f) => {
    if (filterStore.maxPrice !== undefined && Number(f.price) > filterStore.maxPrice) return false;
    if (filterStore.minPrice !== undefined && Number(f.price) < filterStore.minPrice) return false;
    if (filterStore.maxLayovers !== undefined) {
      const layoverCount = f.isLayover ? 1 : 0; // best we can do without a count field
      if (layoverCount > filterStore.maxLayovers) return false;
    }
    if (filterStore.selectedAirlines.length > 0 && !filterStore.selectedAirlines.includes(f.airline)) return false;
    if (filterStore.maxDurationMinutes !== undefined && f.durationMinutes > filterStore.maxDurationMinutes) return false;
    if (filterStore.departureTimeStart) {
      const dep = new Date(f.departureTime).toTimeString().slice(0, 5);
      if (dep < filterStore.departureTimeStart) return false;
    }
    if (filterStore.departureTimeEnd) {
      const dep = new Date(f.departureTime).toTimeString().slice(0, 5);
      if (dep > filterStore.departureTimeEnd) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (sortBy) {
    case 'price_asc':
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case 'price_desc':
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case 'duration_asc':
      sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      break;
    case 'departure_asc':
      sorted.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
      break;
  }
  return sorted;
}

function SortSelect({ sortBy, onChange }: { sortBy: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <select
      value={sortBy}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="text-sm border border-hairline rounded-lg px-3 py-1.5 bg-surface-1 text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/50"
    >
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="duration_asc">Duration: Shortest</option>
      <option value="departure_asc">Departure: Earliest</option>
    </select>
  );
}

function MultiCityResults({ searchQueryId, searchData, allFlights, comparisons }: {
  searchQueryId: string;
  searchData: NonNullable<ReturnType<typeof useSearchResults>['data']>;
  allFlights: Flight[];
  comparisons: ReturnType<typeof useComparisons>['data'];
}) {
  const filterStore = useFilterStore();
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [activeLegIndex, setActiveLegIndex] = useState(0);

  useEffect(() => {
    setActiveLegIndex(0);
  }, [searchQueryId]);

  const legs = searchData.legs ?? [];
  const flightsByLeg = useMemo(
    () => legs.map((leg) => allFlights.filter((f) => f.searchLegId === leg.id)),
    [legs, allFlights]
  );
  const filteredByLeg = useMemo(
    () => flightsByLeg.map((legFlights) => applyFiltersAndSortFor(legFlights, filterStore, sortBy)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flightsByLeg, filterStore, sortBy]
  );

  const comparison = comparisons?.[0] ?? searchData.comparisons?.[0];
  const legFlights = useMemo(
    () => (comparison?.legFlightIds ?? []).map((id) => allFlights.find((f) => f.id === id)).filter((f): f is Flight => !!f),
    [comparison, allFlights]
  );
  const legFlightIds = legFlights.map((f) => f.id);
  const { data: combinedBookingUrl } = useMultiCityBookingUrl(legFlightIds);
  const { data: batchOptions, isLoading: optionsLoading } = useBatchBookingOptions(legFlightIds);
  const legOptions = legFlightIds.map((id) => batchOptions?.[id]?.options ?? null);
  const totalPrice = comparison?.multiCityTotalPrice != null ? Number(comparison.multiCityTotalPrice) : 0;

  const activeFlights = filteredByLeg[activeLegIndex] ?? [];

  return (
    <div className="flex gap-6 items-start">
      <FilterSidebar flights={flightsByLeg[activeLegIndex] ?? []} />
      <div className="flex-1 space-y-8">
        {legFlights.length > 0 && (
          <div className="animate-fadeInUp">
            <MultiCityBundle
              flights={legFlights}
              totalPrice={totalPrice}
              combinedBookingUrl={combinedBookingUrl}
              legOptions={legOptions}
              optionsLoading={optionsLoading}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 bg-surface-1 border border-hairline rounded-full flex-wrap">
            {legs.map((leg, i) => (
              <button
                key={leg.id}
                onClick={() => setActiveLegIndex(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  activeLegIndex === i ? 'bg-surface-2 text-brand-400' : 'text-ink-subtle hover:text-ink-muted'
                }`}
              >
                Flight {i + 1} ({filteredByLeg[i]?.length ?? 0})
              </button>
            ))}
          </div>
          <SortSelect sortBy={sortBy} onChange={setSortBy} />
        </div>

        <ResultsContainer
          key={`leg-${activeLegIndex}`}
          flights={activeFlights}
          title={`${activeFlights.length} flights — ${legs[activeLegIndex]?.originAirport} → ${legs[activeLegIndex]?.destinationAirport}`}
        />
      </div>
    </div>
  );
}

export function SearchResultsPage() {
  const { searchQueryId } = useParams<{ searchQueryId: string }>();
  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useSearchResults(searchQueryId ?? null);
  const { data: flightsData, isLoading: flightsLoading, isFetching: flightsFetching } = useFlights(searchQueryId ?? null);
  const { data: comparisons, isFetching: comparisonsFetching } = useComparisons(searchQueryId ?? null);
  const filterStore = useFilterStore();
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'return'>('outbound');
  const preferredAirlinesApplied = useRef<string | null>(null);

  // Reset to the outbound tab whenever the user lands on a new search.
  useEffect(() => {
    setActiveLeg('outbound');
  }, [searchQueryId]);

  const allFlights: Flight[] = flightsData?.flights ?? searchData?.flights ?? [];
  const originAirport = searchData?.originAirport ?? '';
  const destinationAirport = searchData?.destinationAirport ?? '';
  const isRoundTrip = searchData?.tripType === TripType.ROUND_TRIP;
  const isMultiCity = searchData?.tripType === TripType.MULTI_CITY;

  const { outbound: outboundFlights, return: returnFlights } = useMemo(
    () => splitFlightsByDirection(allFlights, originAirport, destinationAirport),
    [allFlights, originAirport, destinationAirport]
  );

  // Pre-populate airline filter from search form's preferredAirlines once per search
  useEffect(() => {
    if (
      !searchData?.preferredAirlines?.length ||
      !allFlights.length ||
      preferredAirlinesApplied.current === searchQueryId
    ) return;

    const actualAirlines = [...new Set(outboundFlights.map((f) => f.airline))];
    const matched = actualAirlines.filter((actual) =>
      searchData.preferredAirlines!.some(
        (pref: string) =>
          actual.toLowerCase().startsWith(pref.toLowerCase()) ||
          pref.toLowerCase().startsWith(actual.toLowerCase())
      )
    );

    if (matched.length > 0 && filterStore.selectedAirlines.length === 0) {
      filterStore.setSelectedAirlines(matched);
    }
    preferredAirlinesApplied.current = searchQueryId ?? null;
  }, [allFlights, searchData?.preferredAirlines, searchQueryId]);

  const searchDone = searchData?.status === 'COMPLETED' || searchData?.status === 'FAILED';
  // Show spinner while loading OR while status is still PENDING (avoids "No flights found" flash
  // that appeared between the initial response and the first poll completing).
  const isStillSearching =
    searchLoading ||
    flightsLoading ||
    searchData?.status === 'PENDING' ||
    (!searchDone && (searchFetching || flightsFetching));

  const filteredAndSortedFlights = useMemo(
    () => applyFiltersAndSortFor(outboundFlights, filterStore, sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outboundFlights, filterStore, sortBy]
  );

  const filteredAndSortedReturnFlights = useMemo(
    () => applyFiltersAndSortFor(returnFlights, filterStore, sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [returnFlights, filterStore, sortBy]
  );

  const latestComparison = comparisons?.[0] ?? searchData?.comparisons?.[0];
  const isComparisonLoading = !latestComparison && comparisonsFetching;

  const activeComparison = useMemo(() => {
    if (!latestComparison) return null;
    if (filterStore.selectedAirlines.length > 0) {
      return computeFilteredComparison(filteredAndSortedFlights, filteredAndSortedReturnFlights, latestComparison);
    }
    return latestComparison;
  }, [latestComparison, filterStore.selectedAirlines, filteredAndSortedFlights, filteredAndSortedReturnFlights]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {isStillSearching ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" label="Searching for flights..." />
        </div>
      ) : searchDone && allFlights.length === 0 && !flightsLoading && !flightsFetching ? (
        <div className="flex flex-col items-center justify-center py-24 text-ink-cool">
          <div className="text-4xl mb-4">No flights found</div>
          <p className="text-lg">Try adjusting your search — different dates, airports, or fewer filters.</p>
        </div>
      ) : isMultiCity && searchData ? (
        <MultiCityResults
          searchQueryId={searchQueryId ?? ''}
          searchData={searchData}
          allFlights={allFlights}
          comparisons={comparisons}
        />
      ) : (
        <div className="flex gap-6 items-start">
          <FilterSidebar flights={outboundFlights} />
          <div className="flex-1 space-y-8">
            {isComparisonLoading ? (
              <div className="card flex justify-center py-8">
                <LoadingSpinner size="md" label="Building comparison analysis..." />
              </div>
            ) : activeComparison ? (
              <ComparisonView
                comparison={activeComparison}
                roundTripFlights={activeComparison.roundTripFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter((f): f is Flight => !!f) ?? []}
                oneWayOutboundFlights={activeComparison.oneWayOutboundFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter((f): f is Flight => !!f) ?? []}
                oneWayReturnFlights={activeComparison.oneWayReturnFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter((f): f is Flight => !!f) ?? []}
                allOutboundFlights={outboundFlights}
                allReturnFlights={returnFlights}
              />
            ) : null}

            {/* Tabs (round trip only) + sort */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {isRoundTrip && returnFlights.length > 0 ? (
                <div className="inline-flex items-center gap-1 p-1 bg-surface-1 border border-hairline rounded-full">
                  <button
                    onClick={() => setActiveLeg('outbound')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                      activeLeg === 'outbound' ? 'bg-surface-2 text-brand-400' : 'text-ink-subtle hover:text-ink-muted'
                    }`}
                  >
                    Outbound ({filteredAndSortedFlights.length})
                  </button>
                  <button
                    onClick={() => setActiveLeg('return')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                      activeLeg === 'return' ? 'bg-surface-2 text-brand-400' : 'text-ink-subtle hover:text-ink-muted'
                    }`}
                  >
                    Return ({filteredAndSortedReturnFlights.length})
                  </button>
                </div>
              ) : (
                <span className="text-sm text-ink-cool">
                  {filteredAndSortedFlights.length} of {outboundFlights.length} flights
                </span>
              )}
              <SortSelect sortBy={sortBy} onChange={setSortBy} />
            </div>

            {isRoundTrip && returnFlights.length > 0 ? (
              activeLeg === 'outbound' ? (
                <ResultsContainer
                  key="outbound"
                  flights={filteredAndSortedFlights}
                  title={`${filteredAndSortedFlights.length} outbound flights`}
                />
              ) : (
                <ResultsContainer
                  key="return"
                  flights={filteredAndSortedReturnFlights}
                  title={`${filteredAndSortedReturnFlights.length} return flights`}
                />
              )
            ) : (
              <ResultsContainer
                flights={filteredAndSortedFlights}
                title={`${filteredAndSortedFlights.length} outbound flights`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
