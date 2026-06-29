import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlightTimeline } from '../components/results/FlightTimeline';

describe('FlightTimeline', () => {
  it('shows the real airport-local departure/arrival time, not a browser-timezone-shifted one', () => {
    // Real case that surfaced this bug: stored as "06:30"/"13:11" UTC-labeled
    // (the airport-local wall-clock digits, mislabeled in transit) — used to
    // render as "2:30 AM"/"9:11 AM" once the viewer's local timezone shifted
    // them. Must render the original digits regardless of viewer timezone.
    render(
      <FlightTimeline
        departureTime="2026-07-04T06:30:00.000Z"
        arrivalTime="2026-07-04T13:11:00.000Z"
        departureAirport="EWR"
        arrivalAirport="LAS"
        durationMinutes={581}
        isLayover={true}
        layoverAirport="PDX"
        layoverDurationMinutes={72}
      />
    );

    expect(screen.getByText('6:30 AM')).toBeInTheDocument();
    expect(screen.getByText('1:11 PM')).toBeInTheDocument();
  });
});
