import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchResults, useFlights, useComparisons } from '../hooks/useSearch';
import { useFilterStore } from '../stores/filterStore';
import { FilterSidebar } from '../components/filters/FilterSidebar';
import { ResultsContainer } from '../components/results/ResultsContainer';
import { ComparisonView } from '../components/comparison/ComparisonView';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { splitFlightsByDirection, computeFilteredComparison } from '../utils/flightComparison';
import type { Flight } from '@flightselect/shared';
import { TripType } from '@flightselect/shared';

export type SortOption = 'price_asc' | 'price_desc' | 'duration_asc' | 'departure_asc';

export function SearchResultsPage() {
  const { searchQueryId } = useParams<{ searchQueryId: string }>();
  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useSearchResults(searchQueryId ?? null);
  const { data: flightsData, isLoading: flightsLoading, isFetching: flightsFetching } = useFlights(searchQueryId ?? null);
  const { data: comparisons, isFetching: comparisonsFetching } = useComparisons(searchQueryId ?? null);
  const filterStore = useFilterStore();
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const preferredAirlinesApplied = useRef<string | null>(null);

  const allFlights: Flight[] = flightsData?.flights ?? searchData?.flights ?? [];
  const originAirport = searchData?.originAirport ?? '';
  const destinationAirport = searchData?.destinationAirport ?? '';
  const isRoundTrip = searchData?.tripType === TripType.ROUND_TRIP;

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

  function applyFiltersAndSort(flights: Flight[]): Flight[] {
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

  const filteredAndSortedFlights = useMemo(
    () => applyFiltersAndSort(outboundFlights),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outboundFlights, filterStore, sortBy]
  );

  const filteredAndSortedReturnFlights = useMemo(
    () => applyFiltersAndSort(returnFlights),
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
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <div className="text-4xl mb-4">No flights found</div>
          <p className="text-lg">Try adjusting your search — different dates, airports, or fewer filters.</p>
        </div>
      ) : (
        <div className="flex gap-6">
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
                ).filter(Boolean) ?? []}
                oneWayOutboundFlights={activeComparison.oneWayOutboundFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter(Boolean) ?? []}
                oneWayReturnFlights={activeComparison.oneWayReturnFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter(Boolean) ?? []}
              />
            ) : null}

            {/* Sort + count bar */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {filteredAndSortedFlights.length} of {outboundFlights.length} flights
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="duration_asc">Duration: Shortest</option>
                <option value="departure_asc">Departure: Earliest</option>
              </select>
            </div>

            <ResultsContainer
              flights={filteredAndSortedFlights}
              title={`${filteredAndSortedFlights.length} outbound flights`}
            />

            {isRoundTrip && returnFlights.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {filteredAndSortedReturnFlights.length} of {returnFlights.length} return flights
                  </span>
                </div>
                <ResultsContainer
                  flights={filteredAndSortedReturnFlights}
                  title={`${filteredAndSortedReturnFlights.length} return flights`}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
