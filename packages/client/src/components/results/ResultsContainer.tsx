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
      {title && <h2 className="text-h2 text-[1rem] text-ink-muted mb-3">{title}</h2>}
      <div className="space-y-3">
        {flights.map((flight, i) => (
          <div key={flight.id} className="animate-fadeInUp" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
            <FlightCard flight={flight} />
          </div>
        ))}
      </div>
    </div>
  );
}
