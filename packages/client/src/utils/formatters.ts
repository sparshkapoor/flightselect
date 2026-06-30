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
// labeled UTC in transit). Reading with the viewer's local timezone (e.g.
// `Date.toTimeString()`) would re-interpret those digits and produce the
// wrong clock time — always read the UTC fields directly instead, which
// yields the original, correct digits. Any code comparing or displaying
// flight times must go through this function, not `Date` local-time methods.
export function getLocalHHMM(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatTime(dateStr: string): string {
  const [hourStr, minuteStr] = getLocalHHMM(dateStr).split(':');
  const hours = Number(hourStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minuteStr} ${period}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Same UTC-pinned constraint as formatTime above — the date portion of a
// flight timestamp is airport-local digits, not a real instant.
export function formatFlightDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatPriceDifference(diff: number): string {
  const abs = Math.abs(diff);
  return `$${abs.toFixed(0)}`;
}

// Unlike flight departure/arrival times, scrapedAt is a real instant (when we
// hit SerpAPI), not a naive airport-local label — format it in the viewer's
// own timezone, the normal way.
export function formatScrapedAt(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr));
}
