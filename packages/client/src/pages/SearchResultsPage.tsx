import { useParams } from 'react-router-dom';
import { useSearchResults, useFlights, useComparisons } from '../hooks/useSearch';
import { useFilterStore } from '../stores/filterStore';
import { FilterSidebar } from '../components/filters/FilterSidebar';
import { ResultsContainer } from '../components/results/ResultsContainer';
import { ComparisonView } from '../components/comparison/ComparisonView';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Flight } from '@flightselect/shared';

export function SearchResultsPage() {
  const { searchQueryId } = useParams<{ searchQueryId: string }>();
  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useSearchResults(searchQueryId ?? null);
  const { data: flightsData, isLoading: flightsLoading, isFetching: flightsFetching } = useFlights(searchQueryId ?? null);
  const { data: comparisons, isFetching: comparisonsFetching } = useComparisons(searchQueryId ?? null);
  const filterStore = useFilterStore();

  const allFlights: Flight[] = flightsData?.flights ?? searchData?.flights ?? [];
  const searchDone = searchData?.status === 'COMPLETED' || searchData?.status === 'FAILED';
  const isStillSearching = searchLoading || flightsLoading || (!searchDone && (searchFetching || flightsFetching));

  const filteredFlights = allFlights.filter((f) => {
    if (filterStore.maxPrice !== undefined && Number(f.price) > filterStore.maxPrice) return false;
    if (filterStore.minPrice !== undefined && Number(f.price) < filterStore.minPrice) return false;
    if (filterStore.maxLayovers !== undefined && f.isLayover && filterStore.maxLayovers === 0) return false;
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

  const latestComparison = comparisons?.[0] ?? searchData?.comparisons?.[0];
  const isComparisonLoading = !latestComparison && comparisonsFetching;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {isStillSearching ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" label="Searching for flights..." />
        </div>
      ) : searchDone && allFlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <div className="text-4xl mb-4">No flights found</div>
          <p className="text-lg">Try adjusting your search — different dates, airports, or fewer filters.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          <FilterSidebar flights={allFlights} />
          <div className="flex-1 space-y-8">
            {isComparisonLoading ? (
              <div className="card flex justify-center py-8">
                <LoadingSpinner size="md" label="Building comparison analysis..." />
              </div>
            ) : latestComparison ? (
              <ComparisonView
                comparison={latestComparison}
                roundTripFlights={latestComparison.roundTripFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter(Boolean) ?? []}
                oneWayOutboundFlights={latestComparison.oneWayOutboundFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter(Boolean) ?? []}
                oneWayReturnFlights={latestComparison.oneWayReturnFlightIds?.map((id: string) =>
                  allFlights.find((f) => f.id === id)
                ).filter(Boolean) ?? []}
              />
            ) : null}
            <ResultsContainer
              flights={filteredFlights}
              title={`${filteredFlights.length} flights found`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
