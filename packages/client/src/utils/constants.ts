export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First Class',
};

export const TRIP_TYPE_LABELS: Record<string, string> = {
  ONE_WAY: 'One Way',
  ROUND_TRIP: 'Round Trip',
};
