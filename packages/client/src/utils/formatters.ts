import { format } from 'date-fns';

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

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, h:mm a');
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a');
}

export function formatPriceDifference(diff: number): string {
  const abs = Math.abs(diff);
  return `$${abs.toFixed(0)}`;
}
