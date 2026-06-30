import { useNavigate } from 'react-router-dom';
import { AirportInput } from './AirportInput';
import { DatePicker } from './DatePicker';
import { PassengerSelector } from './PassengerSelector';
import { CabinClassSelector } from './CabinClassSelector';
import { AdvancedFilters } from './AdvancedFilters';
import { MultiCityLegEditor } from './MultiCityLegEditor';
import { useSearchStore } from '../../stores/searchStore';
import { useSearchSubmit } from '../../hooks/useSearch';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TripType } from '@flightselect/shared';

const TRIP_TYPE_OPTIONS: { value: TripType; label: string }[] = [
  { value: TripType.ROUND_TRIP, label: 'Round trip' },
  { value: TripType.ONE_WAY, label: 'One-way' },
  { value: TripType.MULTI_CITY, label: 'Multi-city' },
];

export function SearchForm() {
  const store = useSearchStore();
  const { submitSearch, isSubmitting, error } = useSearchSubmit();
  const navigate = useNavigate();

  const isMultiCity = store.tripType === TripType.MULTI_CITY;
  const isRoundTrip = store.tripType === TripType.ROUND_TRIP;

  const legsValid =
    store.legs.length >= 2 &&
    store.legs.every((leg) => leg.originAirport && leg.destinationAirport && leg.departureDate);
  const singleRouteValid = !!store.originAirport && !!store.destinationAirport && !!store.departureDate;
  const canSubmit = isMultiCity ? legsValid : singleRouteValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const searchQueryId = isMultiCity
      ? await submitSearch({
          // Envelope fields for code that reads origin/destination/departureDate directly —
          // the per-leg routes in `legs` are authoritative for multi-city.
          originAirport: store.legs[0].originAirport,
          destinationAirport: store.legs[store.legs.length - 1].destinationAirport,
          departureDate: store.legs[0].departureDate,
          tripType: store.tripType,
          passengers: store.passengers,
          cabinClass: store.cabinClass,
          maxLayovers: store.maxLayovers,
          legs: store.legs,
        })
      : await submitSearch({
          originAirport: store.originAirport,
          destinationAirport: store.destinationAirport,
          departureDate: store.departureDate,
          returnDate: isRoundTrip ? store.returnDate || undefined : undefined,
          tripType: store.tripType,
          passengers: store.passengers,
          cabinClass: store.cabinClass,
          maxLayovers: store.maxLayovers,
          flexibleDates: store.flexibleDates,
          flexibleDateRangeDays: store.flexibleDateRangeDays,
          includeNearbyAirports: store.includeNearbyAirports,
          nearbyRadiusMiles: store.nearbyRadiusMiles,
          preferredAirlines: store.preferredAirlines.length ? store.preferredAirlines : undefined,
          avoidedAirlines: store.avoidedAirlines.length ? store.avoidedAirlines : undefined,
        });

    if (searchQueryId) {
      navigate(`/results/${searchQueryId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Trip type */}
      <div className="inline-flex items-center gap-1 p-1 bg-surface-1 border border-hairline rounded-full">
        {TRIP_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => store.setTripType(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
              store.tripType === opt.value ? 'bg-surface-2 text-brand-400' : 'text-ink-subtle hover:text-ink-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isMultiCity ? (
        <MultiCityLegEditor
          legs={store.legs}
          onUpdateLeg={store.updateLeg}
          onAddLeg={store.addLeg}
          onRemoveLeg={store.removeLeg}
        />
      ) : (
        <>
          {/* Route */}
          <div className="grid grid-cols-2 gap-4">
            <AirportInput
              label="From"
              value={store.originAirport}
              onChange={store.setOriginAirport}
              placeholder="Origin airport"
            />
            <AirportInput
              label="To"
              value={store.destinationAirport}
              onChange={store.setDestinationAirport}
              placeholder="Destination airport"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Departure"
              value={store.departureDate}
              onChange={store.setDepartureDate}
              required
            />
            {isRoundTrip && (
              <DatePicker
                label="Return"
                value={store.returnDate}
                onChange={store.setReturnDate}
                min={store.departureDate}
              />
            )}
          </div>
        </>
      )}

      {/* Passengers & cabin */}
      <div className="grid grid-cols-2 gap-4">
        <PassengerSelector value={store.passengers} onChange={store.setPassengers} />
        <CabinClassSelector value={store.cabinClass} onChange={store.setCabinClass} />
      </div>

      {/* Advanced — flexible dates / airline preferences don't apply to multi-city legs */}
      {!isMultiCity && (
        <AdvancedFilters
          maxLayovers={store.maxLayovers}
          onMaxLayoversChange={store.setMaxLayovers}
          flexibleDates={store.flexibleDates}
          onFlexibleDatesChange={store.setFlexibleDates}
          flexibleDateRangeDays={store.flexibleDateRangeDays}
          onFlexibleDateRangeDaysChange={store.setFlexibleDateRangeDays}
          includeNearbyAirports={store.includeNearbyAirports}
          onIncludeNearbyAirportsChange={store.setIncludeNearbyAirports}
          nearbyRadiusMiles={store.nearbyRadiusMiles}
          onNearbyRadiusMilesChange={store.setNearbyRadiusMiles}
          preferredAirlines={store.preferredAirlines}
          avoidedAirlines={store.avoidedAirlines}
          onPreferredAirlinesChange={store.setPreferredAirlines}
          onAvoidedAirlinesChange={store.setAvoidedAirlines}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" />
            Searching...
          </>
        ) : (
          'Search Flights'
        )}
      </button>
    </form>
  );
}
