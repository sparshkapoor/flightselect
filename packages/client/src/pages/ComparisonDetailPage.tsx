import { useParams } from 'react-router-dom';
import { useComparison } from '../hooks/useComparison';
import { ComparisonView } from '../components/comparison/ComparisonView';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export function ComparisonDetailPage() {
  const { comparisonId } = useParams<{ comparisonId: string }>();
  const { data, isLoading, error } = useComparison(comparisonId ?? null);

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (error || !data) return <EmptyState title="Comparison not found" icon="🔍" />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ComparisonView
        comparison={data.comparison}
        roundTripFlights={data.roundTripFlights}
        oneWayOutboundFlights={data.oneWayOutboundFlights}
        oneWayReturnFlights={data.oneWayReturnFlights}
      />
    </div>
  );
}
