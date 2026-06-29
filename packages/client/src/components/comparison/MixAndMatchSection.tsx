import type { Flight, BookingOption } from '@flightselect/shared';
import { FlightCard } from '../results/FlightCard';

interface MixAndMatchSectionProps {
  outboundFlight: Flight;
  returnFlight: Flight;
  totalPrice: number;
  isCheapest: boolean;
  savingsAmount: number | null;
  outboundOptions: BookingOption[] | null;
  returnOptions: BookingOption[] | null;
  optionsLoading: boolean;
}

export function MixAndMatchSection({
  outboundFlight,
  returnFlight,
  totalPrice,
  isCheapest,
  savingsAmount,
  outboundOptions,
  returnOptions,
  optionsLoading,
}: MixAndMatchSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-eyebrow text-ink-subtle">MIX &amp; MATCH · DIFFERENT AIRLINES</span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold font-mono text-ink tabular-nums">${totalPrice.toFixed(0)}</span>
          {isCheapest && savingsAmount !== null && savingsAmount > 0 && (
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded-full border border-emerald-500/20">
              Best price
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-ink-faint">
        These are two separate bookings — one with each airline.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FlightCard flight={outboundFlight} mode="eager" eagerOptions={outboundOptions} eagerLoading={optionsLoading} />
        <FlightCard flight={returnFlight} mode="eager" eagerOptions={returnOptions} eagerLoading={optionsLoading} />
      </div>
    </div>
  );
}
