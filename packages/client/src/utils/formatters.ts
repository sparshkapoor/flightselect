export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Flight times are wall-clock time at the departure/arrival airport, stored
// as a naive timestamp with no real timezone conversion applied anywhere in
// the pipeline (scraper -> DB -> API all pass the digits through as-is, just
// labeled UTC in transit). Formatting with the viewer's local timezone would
// re-interpret those digits and show the wrong clock time — read the UTC
// fields directly instead, which yields the original, correct digits.
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatPriceDifference(diff: number): string {
  const abs = Math.abs(diff);
  return `$${abs.toFixed(0)}`;
}
