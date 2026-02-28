import { useQuery } from '@tanstack/react-query';
import { getFlights } from '../api/flights.api';

export function useFlightsList(searchQueryId?: string) {
  return useQuery({
    queryKey: ['flights', searchQueryId],
    queryFn: () => getFlights(searchQueryId),
    enabled: !!searchQueryId,
  });
}
