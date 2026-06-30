import { useEffect, useState } from 'react';
import { queryRag } from '../../api/rag.api';
import type { Comparison } from '@flightselect/shared';

interface AIInsightCardProps {
  comparison: Comparison;
  origin: string;
  destination: string;
  /** Days between when the search was made and the actually-flown date —
   *  absent on the standalone saved-comparison view, which has no SearchQuery. */
  daysUntilDeparture?: number | null;
  flexibleDatesUsed?: boolean;
  flexibleDateRangeDays?: number | null;
}

type State = 'loading' | 'ready' | 'empty';

export function AIInsightCard({
  comparison,
  origin,
  destination,
  daysUntilDeparture,
  flexibleDatesUsed,
  flexibleDateRangeDays,
}: AIInsightCardProps) {
  const [state, setState] = useState<State>('loading');
  const [insight, setInsight] = useState('');

  useEffect(() => {
    const hasRoundTrip = comparison.roundTripTotalPrice !== null;
    const cheaper = hasRoundTrip
      ? Math.min(Number(comparison.roundTripTotalPrice), Number(comparison.oneWayTotalPrice))
      : Number(comparison.oneWayTotalPrice);
    const bookingWindowClause =
      daysUntilDeparture != null
        ? ` This search was made ${daysUntilDeparture} day${daysUntilDeparture === 1 ? '' : 's'} before departure` +
          (flexibleDatesUsed
            ? `, with flexible dates already enabled (±${flexibleDateRangeDays ?? 'several'} days).`
            : ', without flexible dates enabled.')
        : '';
    const question = hasRoundTrip
      ? `${origin} to ${destination}: same-airline $${Number(comparison.roundTripTotalPrice).toFixed(0)}, ` +
        `mix-and-match $${Number(comparison.oneWayTotalPrice).toFixed(0)}. ` +
        `Is $${cheaper.toFixed(0)} a good price for this route?${bookingWindowClause}`
      : `${origin} to ${destination}: $${cheaper.toFixed(0)} one-way, no return flights found. ` +
        `Is $${cheaper.toFixed(0)} a good price for this route?${bookingWindowClause}`;

    const attempt = (retriesLeft: number) => {
      queryRag(question, 'comparison', origin, destination).then((answer) => {
        if (answer) {
          setInsight(answer);
          setState('ready');
        } else if (retriesLeft > 0) {
          // RAG server may still be starting — retry once after 10s
          setTimeout(() => attempt(retriesLeft - 1), 10_000);
        } else {
          setState('empty');
        }
      });
    };
    attempt(1);
  }, [comparison.id]);

  if (state === 'empty') return null;

  return (
    <div className="card flex items-start gap-3 py-3">
      <div className="shrink-0 mt-0.5">
        {state === 'loading' ? (
          <div className="w-4 h-4 rounded-full border-2 border-hairline-strong border-t-brand-500 animate-spin" />
        ) : (
          <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center animate-fadeInUp">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-eyebrow text-brand-400">AI Insight</span>
        {state === 'loading' ? (
          <div className="mt-1.5 space-y-1.5">
            <div className="h-3 skeleton w-full" />
            <div className="h-3 skeleton w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-ink-muted mt-0.5 leading-snug animate-fadeInUp">{insight}</p>
        )}
      </div>
    </div>
  );
}
