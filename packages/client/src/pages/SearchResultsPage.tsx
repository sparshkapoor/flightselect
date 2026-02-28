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
  const { data: searchData, isLoading } = useSearchResults(searchQueryId ?? null);
  const { data: flightsData } = useFlights(searchQueryId ?? null);
  const { data: comparisons } = useComparisons(searchQueryId ?? null);
  const filterStore = useFilterStore();

  const allFlights: Flight[] = flightsData?.flights ?? searchData?.flights ?? [];

  const filteredFlights = allFlights.filter((f) => {
    if (filterStore.maxPrice !== undefined && Number(f.price) > filterStore.maxPrice) return false;
    if (filterStore.maxLayovers !== undefined && f.isLayover && filterStore.maxLayovers === 0) return false;
    if (filterStore.selectedAirlines.length > 0 && !filterStore.selectedAirlines.includes(f.airline)) return false;
    return true;
  });

  const latestComparison = comparisons?.[0] ?? searchData?.comparisons?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" label="Loading results..." />
        </div>
      ) : (
        <div className="flex gap-6">
          <FilterSidebar flights={allFlights} />
          <div className="flex-1 space-y-8">
            {latestComparison && (
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
            )}
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
