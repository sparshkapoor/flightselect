import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createSearch, getSearch } from '../api/search.api';
import { getFlights } from '../api/flights.api';
import { getComparisonsByQuery } from '../api/comparison.api';
import { useSearchStore } from '../stores/searchStore';
import type { SearchRequest } from '@flightselect/shared';

export function useSearchSubmit() {
  const [searchQueryId, setSearchQueryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const store = useSearchStore();

  const submitSearch = useCallback(
    async (data: SearchRequest) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await createSearch(data);
        setSearchQueryId(result.searchQueryId);
        store.setSearchQueryId(result.searchQueryId);
        return result.searchQueryId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed';
        setError(msg);
        store.setSearchError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [store]
  );

  return { submitSearch, searchQueryId, error, isSubmitting };
}

const MAX_POLL_ATTEMPTS = 30;

function isSearchDone(data: any): boolean {
  return data?.status === 'COMPLETED' || data?.status === 'FAILED';
}

export function useSearchResults(searchQueryId: string | null) {
  return useQuery({
    queryKey: ['search', searchQueryId],
    queryFn: () => getSearch(searchQueryId!),
    enabled: !!searchQueryId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (isSearchDone(data)) return false;
      if ((query.state.dataUpdateCount ?? 0) >= MAX_POLL_ATTEMPTS) return false;
      return 2000;
    },
  });
}

export function useFlights(searchQueryId: string | null) {
  const searchResults = useSearchResults(searchQueryId);
  const done = isSearchDone(searchResults.data);

  return useQuery({
    queryKey: ['flights', searchQueryId],
    queryFn: () => getFlights(searchQueryId ?? undefined),
    enabled: !!searchQueryId,
    refetchInterval: (query) => {
      if (done) return false;
      const data = query.state.data;
      if (data?.flights?.length > 0) return false;
      if ((query.state.dataUpdateCount ?? 0) >= MAX_POLL_ATTEMPTS) return false;
      return 2000;
    },
  });
}

export function useComparisons(searchQueryId: string | null) {
  const searchResults = useSearchResults(searchQueryId);
  const done = isSearchDone(searchResults.data);

  return useQuery({
    queryKey: ['comparisons', searchQueryId],
    queryFn: () => getComparisonsByQuery(searchQueryId!),
    enabled: !!searchQueryId,
    refetchInterval: (query) => {
      if (done) return false;
      const data = query.state.data;
      if (data && data.length > 0) return false;
      if ((query.state.dataUpdateCount ?? 0) >= MAX_POLL_ATTEMPTS) return false;
      return 2000;
    },
  });
}
