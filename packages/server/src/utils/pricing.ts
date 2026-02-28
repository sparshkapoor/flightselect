import { CabinClass } from '@flightselect/shared';

const CABIN_CLASS_MULTIPLIERS: Record<CabinClass, number> = {
  [CabinClass.ECONOMY]: 1.0,
  [CabinClass.PREMIUM_ECONOMY]: 1.8,
  [CabinClass.BUSINESS]: 4.0,
  [CabinClass.FIRST]: 8.0,
};

/**
 * Returns a randomized price within domestic or international ranges,
 * scaled by cabin class multiplier.
 */
export function generatePrice(isInternational: boolean, cabinClass: CabinClass): number {
  const baseMin = isInternational ? 300 : 80;
  const baseMax = isInternational ? 2000 : 600;
  const base = Math.random() * (baseMax - baseMin) + baseMin;
  const multiplier = CABIN_CLASS_MULTIPLIERS[cabinClass];
  return Math.round(base * multiplier * 100) / 100;
}

/**
 * Stub: currency conversion. In production, this would call an exchange-rate API.
 */
export function convertCurrency(
  amount: number,
  _fromCurrency: string,
  _toCurrency: string
): number {
  // TODO: Integrate a real exchange-rate API (e.g., exchangeratesapi.io or Open Exchange Rates)
  return amount;
}

export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
