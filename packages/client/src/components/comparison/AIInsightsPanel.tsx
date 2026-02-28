import { useState } from 'react';
import { RecommendedOption } from '@flightselect/shared';

interface AIInsightsPanelProps {
  aiAnalysis: string | null;
}

interface ParsedAnalysis {
  summary: string;
  recommendation: RecommendedOption;
  confidenceScore: number;
  reasoning: string[];
  warnings: string[];
}

function parseAnalysis(raw: string | null): ParsedAnalysis | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedAnalysis;
  } catch {
    return null;
  }
}

export function AIInsightsPanel({ aiAnalysis }: AIInsightsPanelProps) {
  const [followUp, setFollowUp] = useState('');
  const analysis = parseAnalysis(aiAnalysis);

  const confidencePct = analysis ? Math.round(analysis.confidenceScore * 100) : 0;
  const confidenceColor =
    confidencePct >= 80 ? 'bg-green-500' : confidencePct >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="card border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="font-semibold text-gray-800">AI Analysis</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
            Powered by AI
          </span>
        </div>
        <button
          className="btn-secondary text-xs py-1 px-3"
          onClick={() => alert('AI regeneration coming soon!')}
        >
          ↻ Regenerate
        </button>
      </div>

      {!analysis ? (
        <p className="text-gray-400 italic text-sm">AI analysis not yet available for this comparison.</p>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <p className="text-gray-700 text-sm leading-relaxed">{analysis.summary}</p>

          {/* Confidence */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Confidence</span>
              <span>{confidencePct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${confidenceColor}`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>

          {/* Reasoning */}
          {analysis.reasoning.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Why?
              </h4>
              <ul className="space-y-1">
                {analysis.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-1.5">
                ⚠ Considerations
              </h4>
              <ul className="space-y-1">
                {analysis.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-yellow-700">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up */}
          <div className="pt-2 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Ask a follow-up question
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="e.g. What if I fly business class?"
                className="input-field text-sm flex-1"
              />
              <button
                className="btn-secondary text-sm px-3"
                onClick={() => alert('Follow-up questions coming soon!')}
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
