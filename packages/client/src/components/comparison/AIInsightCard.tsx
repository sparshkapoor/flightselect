import { useEffect, useState } from 'react';
import { queryRag } from '../../api/rag.api';
import type { Comparison } from '@flightselect/shared';

interface AIInsightCardProps {
  comparison: Comparison;
  origin: string;
  destination: string;
}

type State = 'loading' | 'ready' | 'empty';

export function AIInsightCard({ comparison, origin, destination }: AIInsightCardProps) {
  const [state, setState] = useState<State>('loading');
  const [insight, setInsight] = useState('');

  useEffect(() => {
    const cheaper = Math.min(
      Number(comparison.roundTripTotalPrice),
      Number(comparison.oneWayTotalPrice)
    );
    const question =
      `${origin} to ${destination}: same-airline $${Number(comparison.roundTripTotalPrice).toFixed(0)}, ` +
      `mix-and-match $${Number(comparison.oneWayTotalPrice).toFixed(0)}. ` +
      `Is $${cheaper.toFixed(0)} a good price for this route?`;

    const attempt = (retriesLeft: number) => {
      queryRag(question, 'comparison').then((answer) => {
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
          <div className="w-4 h-4 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin" />
        ) : (
          <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">AI Insight</span>
        {state === 'loading' ? (
          <div className="mt-1.5 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-gray-700 mt-0.5 leading-snug">{insight}</p>
        )}
      </div>
    </div>
  );
}
