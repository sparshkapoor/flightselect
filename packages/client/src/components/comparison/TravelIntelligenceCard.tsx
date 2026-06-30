import { useEffect, useState } from 'react';
import { queryKnowledge } from '../../api/rag.api';
import type { Comparison, Flight } from '@flightselect/shared';

interface TravelIntelligenceCardProps {
  comparison: Comparison;
  origin: string;
  destination: string;
  flights: Flight[];
}

type State = 'loading' | 'ready' | 'empty';

function formatAsOf(asOf: string): string {
  if (!asOf) return '';
  const [year, month] = asOf.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function TravelIntelligenceCard({ comparison, origin, destination, flights }: TravelIntelligenceCardProps) {
  const [state, setState] = useState<State>('loading');
  const [insight, setInsight] = useState('');
  const [asOf, setAsOf] = useState('');
  const [stale, setStale] = useState(false);

  const airlines = [...new Set(flights.map((f) => f.airline))];

  useEffect(() => {
    const itinerarySummary = `${origin} to ${destination}, ${airlines.join(', ') || 'unknown airline'}`;

    const attempt = (retriesLeft: number) => {
      queryKnowledge(itinerarySummary, airlines).then((result) => {
        if (result) {
          setInsight(result.answer);
          setAsOf(result.asOf);
          setStale(result.stale);
          setState('ready');
        } else if (retriesLeft > 0) {
          // RAG server may still be starting (or seeding knowledge on boot) — retry once.
          setTimeout(() => attempt(retriesLeft - 1), 10_000);
        } else {
          setState('empty');
        }
      });
    };
    attempt(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-eyebrow text-brand-400">Travel Intelligence</span>
          {state === 'ready' && asOf && (
            <span
              className={
                stale
                  ? 'text-[10px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-[10px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 bg-surface-2 text-ink-subtle border border-hairline'
              }
            >
              {stale ? 'verify' : `as of ${formatAsOf(asOf)}`}
            </span>
          )}
        </div>
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
