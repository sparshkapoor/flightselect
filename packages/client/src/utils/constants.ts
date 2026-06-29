// Relative by default: Vite's dev server proxies /api to localhost:3001 (vite.config.ts),
// and nginx proxies /api to the api container in production (nginx/nginx.conf) — so the
// same relative path works same-origin in both dev and prod without hitting CORS.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First Class',
};

