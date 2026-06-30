import { useQuery } from '@tanstack/react-query';
import { getMultiCityBookingUrl } from '../api/flights.api';

/** flightIds must be in leg order (legIndex 0..N-1). */
export function useMultiCityBookingUrl(flightIds: string[]) {
  return useQuery({
    queryKey: ['multiCityBookingUrl', ...flightIds],
    queryFn: () => getMultiCityBookingUrl(flightIds),
    enabled: flightIds.length >= 2,
  });
}
