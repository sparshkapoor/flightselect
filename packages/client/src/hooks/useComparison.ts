import { useQuery } from '@tanstack/react-query';
import { getComparison } from '../api/comparison.api';

export function useComparison(comparisonId: string | null) {
  return useQuery({
    queryKey: ['comparison', comparisonId],
    queryFn: () => getComparison(comparisonId!),
    enabled: !!comparisonId,
  });
}
