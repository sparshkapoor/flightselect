import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { Comparison } from '@flightselect/shared';
import { RecommendedOption } from '@flightselect/shared';
import { AIInsightCard } from '../components/comparison/AIInsightCard';
import { queryRag } from '../api/rag.api';

vi.mock('../api/rag.api', () => ({
  queryRag: vi.fn(),
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

describe('AIInsightCard', () => {
  beforeEach(() => {
    vi.mocked(queryRag).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the grounded answer RAG returns for this route', async () => {
    vi.mocked(queryRag).mockResolvedValueOnce('This is a typical price for this route.');

    render(<AIInsightCard comparison={makeComparison()} origin="JFK" destination="LAX" />);

    expect(await screen.findByText(/typical price for this route/i)).toBeInTheDocument();
    expect(queryRag).toHaveBeenCalledWith(expect.any(String), 'comparison', 'JFK', 'LAX');
  });

  it('includes the booking-window context in the question when provided', async () => {
    vi.mocked(queryRag).mockResolvedValueOnce('Booked early, so this is a fair price.');

    render(
      <AIInsightCard
        comparison={makeComparison()}
        origin="JFK"
        destination="LAX"
        daysUntilDeparture={2}
        flexibleDatesUsed={false}
      />
    );

    await screen.findByText(/fair price/i);
    expect(queryRag).toHaveBeenCalledWith(
      expect.stringContaining('2 days before departure'),
      'comparison',
      'JFK',
      'LAX'
    );
    expect(queryRag).toHaveBeenCalledWith(
      expect.stringContaining('without flexible dates enabled'),
      'comparison',
      'JFK',
      'LAX'
    );
  });

  it('hides itself rather than showing a raw fallback sentence when RAG has no data scoped to this route yet', async () => {
    vi.useFakeTimers();
    vi.mocked(queryRag).mockResolvedValue(null);

    const { container } = render(
      <AIInsightCard comparison={makeComparison()} origin="JFK" destination="LAX" />
    );

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(queryRag).toHaveBeenCalledTimes(1);

    // Component retries once after 10s before giving up.
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(queryRag).toHaveBeenCalledTimes(2);

    // Flush the second attempt's resolved promise (.then -> setState('empty')).
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(container).toBeEmptyDOMElement();
  });
});
