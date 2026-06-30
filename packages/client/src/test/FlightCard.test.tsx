import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Flight } from '@flightselect/shared';
import { FlightCard } from '../components/results/FlightCard';

function makeFlight(): Flight {
  return {
    id: 'f1',
    airline: 'Delta',
    flightNumber: 'DL100',
    departureAirport: 'JFK',
    arrivalAirport: 'LAX',
    departureTime: '2026-07-10T08:00:00Z',
    arrivalTime: '2026-07-10T11:00:00Z',
    durationMinutes: 360,
    price: 250,
    currency: 'USD',
    cabinClass: 'ECONOMY' as any,
    isLayover: false,
    layoverAirport: null,
    layoverDurationMinutes: null,
    source: 'serpapi',
    scrapedAt: '2026-06-26T00:00:00Z',
    bookingUrl: 'https://google.com/flights',
    searchQueryId: 'sq1',
  } as unknown as Flight;
}

describe('FlightCard booking options (lazy mode)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reaches a terminal "Unavailable" state on a definitive failure message and never re-fetches on a second click', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ options: [], message: 'No booking token available for this flight' }),
    } as Response);

    render(<FlightCard flight={makeFlight()} />);

    fireEvent.click(screen.getByRole('button', { name: 'View booking options' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Unavailable' })).toBeInTheDocument());
    expect(screen.getByText('No booking token available for this flight')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Button is disabled once a definitive (even empty) result has been reached,
    // so this click is a no-op — but assert directly that no second network
    // call fires, which is the actual bug this guards against.
    fireEvent.click(screen.getByRole('button', { name: 'Unavailable' }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows plain "No sellers found" with no error text for a genuine empty result', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ options: [] }),
    } as Response);

    render(<FlightCard flight={makeFlight()} />);

    fireEvent.click(screen.getByRole('button', { name: 'View booking options' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'No sellers found' })).toBeInTheDocument());
    expect(screen.queryByText(/booking lookup failed/i)).not.toBeInTheDocument();
  });
});
