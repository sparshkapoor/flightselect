import { useQuery } from '@tanstack/react-query';
import { getRoundTripBookingUrl } from '../api/flights.api';

export function useRoundTripBookingUrl(outboundId: string | null, returnId: string | null) {
  return useQuery({
    queryKey: ['roundTripBookingUrl', outboundId, returnId],
    queryFn: () => getRoundTripBookingUrl(outboundId!, returnId!),
    enabled: !!outboundId && !!returnId,
  });
}
