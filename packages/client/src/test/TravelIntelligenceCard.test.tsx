import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { Comparison } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';
import { TravelIntelligenceCard } from '../components/comparison/TravelIntelligenceCard';
import { queryKnowledge } from '../api/rag.api';

vi.mock('../api/rag.api', () => ({
  queryKnowledge: vi.fn(),
}));

function makeComparison(): Comparison {
  return {
    id: 'cmp1',
    searchQueryId: 'sq1',
    roundTripFlightIds: ['f1', 'f2'],
    oneWayOutboundFlightIds: ['f1'],
    oneWayReturnFlightIds: ['f2'],
    roundTripTotalPrice: 400,
    oneWayTotalPrice: 420,
    priceDifference: -20,
    recommendedOption: RecommendedOption.ROUND_TRIP,
    aiAnalysis: null,
    aiAnalysisGeneratedAt: null,
    createdAt: '2026-06-26T00:00:00Z',
    legFlightIds: [],
    multiCityTotalPrice: null,
    sameAirlineAvailable: true,
  };
}

describe('TravelIntelligenceCard', () => {
  beforeEach(() => {
    vi.mocked(queryKnowledge).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('strips markdown artifacts a weak local model can dump back verbatim', async () => {
    // Mirrors the real failure observed in testing: bullet labels, bold
    // markers, and a leaked section heading from the retrieved chunk.
    const messy =
      '- **Points & Miles Consideration:** Capital One Miles offers 1.7–1.85 cents per point.\n' +
      '**Points & Miles — Reference — What the Pipeline Surfaces Automatically:**\n' +
      '1. **Cash-equivalent value:** "Using 45,000 SkyMiles..."';
    vi.mocked(queryKnowledge).mockResolvedValueOnce({ answer: messy, asOf: '2025-07', stale: false });

    render(
      <TravelIntelligenceCard
        comparison={makeComparison()}
        origin="JFK"
        destination="LAX"
        flights={[]}
      />
    );

    const text = await screen.findByText(/Capital One Miles/);
    expect(text.textContent).not.toMatch(/[*#]/);
    expect(text.textContent).not.toMatch(/^-/);
  });

  it('shows the as-of freshness pill for a clean answer', async () => {
    vi.mocked(queryKnowledge).mockResolvedValueOnce({
      answer: 'United Explorer waives the first checked bag when you pay with the card.',
      asOf: '2025-08',
      stale: false,
    });

    render(
      <TravelIntelligenceCard comparison={makeComparison()} origin="JFK" destination="EWR" flights={[]} />
    );

    expect(await screen.findByText(/United Explorer waives/)).toBeInTheDocument();
    expect(screen.getByText(/as of/i)).toBeInTheDocument();
  });

  it('shows a verify pill instead of a date when the chunk is stale', async () => {
    vi.mocked(queryKnowledge).mockResolvedValueOnce({
      answer: 'Southwest charges for bags on Wanna Get Away fares.',
      asOf: '2025-01',
      stale: true,
    });

    render(
      <TravelIntelligenceCard comparison={makeComparison()} origin="JFK" destination="EWR" flights={[]} />
    );

    expect(await screen.findByText(/Southwest charges/)).toBeInTheDocument();
    expect(screen.getByText('verify')).toBeInTheDocument();
  });

  it('hides itself rather than showing a raw fallback when no knowledge is available', async () => {
    vi.useFakeTimers();
    vi.mocked(queryKnowledge).mockResolvedValue(null);

    const { container } = render(
      <TravelIntelligenceCard comparison={makeComparison()} origin="JFK" destination="EWR" flights={[]} />
    );

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(queryKnowledge).toHaveBeenCalledTimes(1);

    // Component retries once after 10s before giving up.
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(queryKnowledge).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(container).toBeEmptyDOMElement();
  });
});
