import type { Flight } from '@flightselect/shared';
import { FlightCard } from './FlightCard';
import { EmptyState } from '../common/EmptyState';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ResultsContainerProps {
  flights: Flight[];
  isLoading?: boolean;
  title?: string;
}

export function ResultsContainer({ flights, isLoading, title }: ResultsContainerProps) {
  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" label="Searching flights..." />
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <EmptyState
        title="No flights found"
        description="Try adjusting your search criteria or dates."
      />
    );
  }

  return (
    <div>
      {title && <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>}
      <div className="space-y-3">
        {flights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>
    </div>
  );
}
