import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripType, CabinClass } from '@flightselect/shared';
import { AirportInput } from './AirportInput';
import { DatePicker } from './DatePicker';
import { PassengerSelector } from './PassengerSelector';
import { CabinClassSelector } from './CabinClassSelector';
import { AdvancedFilters } from './AdvancedFilters';
import { useSearchStore } from '../../stores/searchStore';
import { useSearchSubmit } from '../../hooks/useSearch';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function SearchForm() {
  const store = useSearchStore();
  const { submitSearch, isSubmitting } = useSearchSubmit();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store.originAirport || !store.destinationAirport || !store.departureDate) return;

    const searchQueryId = await submitSearch({
      originAirport: store.originAirport,
      destinationAirport: store.destinationAirport,
      departureDate: store.departureDate,
      returnDate: store.returnDate || undefined,
      tripType: store.tripType,
      passengers: store.passengers,
      cabinClass: store.cabinClass,
      maxLayovers: store.maxLayovers,
      flexibleDates: store.flexibleDates,
      flexibleDateRangeDays: store.flexibleDateRangeDays,
      preferredAirlines: store.preferredAirlines.length ? store.preferredAirlines : undefined,
      avoidedAirlines: store.avoidedAirlines.length ? store.avoidedAirlines : undefined,
    });

    if (searchQueryId) {
      navigate(`/results/${searchQueryId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 shadow-md">
      {/* Trip type toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[TripType.ROUND_TRIP, TripType.ONE_WAY].map((t) => (
            <button
              key={t}
              type="button"
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                store.tripType === t
                  ? 'bg-white shadow text-brand-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => store.setTripType(t)}
            >
              {t === TripType.ROUND_TRIP ? 'Round Trip' : 'One Way'}
            </button>
          ))}
        </div>

        {/* Compare mode */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={store.compareMode}
            onChange={(e) => store.setCompareMode(e.target.checked)}
            className="rounded accent-brand-600"
          />
          <span className="text-sm font-medium text-brand-700">
            🔍 Compare Round Trip vs One-Way
          </span>
        </label>
      </div>

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
        <DatePicker
          label={store.tripType === TripType.ROUND_TRIP ? 'Return' : 'Return (optional)'}
          value={store.returnDate}
          onChange={store.setReturnDate}
          min={store.departureDate}
        />
      </div>

      {/* Passengers & cabin */}
      <div className="grid grid-cols-2 gap-4">
        <PassengerSelector value={store.passengers} onChange={store.setPassengers} />
        <CabinClassSelector value={store.cabinClass} onChange={store.setCabinClass} />
      </div>

      {/* Advanced */}
      <AdvancedFilters
        maxLayovers={store.maxLayovers}
        onMaxLayoversChange={store.setMaxLayovers}
        flexibleDates={store.flexibleDates}
        onFlexibleDatesChange={store.setFlexibleDates}
        flexibleDateRangeDays={store.flexibleDateRangeDays}
        onFlexibleDateRangeDaysChange={store.setFlexibleDateRangeDays}
        preferredAirlines={store.preferredAirlines}
        avoidedAirlines={store.avoidedAirlines}
        onPreferredAirlinesChange={store.setPreferredAirlines}
        onAvoidedAirlinesChange={store.setAvoidedAirlines}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !store.originAirport || !store.destinationAirport || !store.departureDate}
        className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" />
            Searching...
          </>
        ) : (
          '🔍 Search Flights'
        )}
      </button>
    </form>
  );
}
