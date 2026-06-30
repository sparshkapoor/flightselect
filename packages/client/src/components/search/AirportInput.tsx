import { useState, useRef, useEffect } from 'react';
import { searchAirports, getAirportByCode, AIRPORTS, type Airport } from '../../utils/airportData';

interface AirportInputProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  label?: string;
}

export function AirportInput({ value, onChange, placeholder = 'Airport', label }: AirportInputProps) {
  const [query, setQuery] = useState(() => {
    if (value) {
      const airport = getAirportByCode(value);
      return airport ? `${airport.code} — ${airport.city}` : value;
    }
    return '';
  });
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [blurredWithoutSelection, setBlurredWithoutSelection] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // The list actually rendered below — kept here too so keyboard nav and
  // mouse clicks always agree on what "item N" refers to.
  const visibleResults = results.length > 0 ? results : query.length === 0 ? AIRPORTS.slice(0, 15) : [];

  useEffect(() => {
    if (!value && query) {
      setQuery('');
      setBlurredWithoutSelection(false);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectAirport(airport: Airport) {
    setQuery(`${airport.code} — ${airport.city}`);
    onChange(airport.code);
    setOpen(false);
    setBlurredWithoutSelection(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setBlurredWithoutSelection(false);
    setHighlightedIndex(0);
    if (value) onChange('');
    if (val.length >= 1) {
      setResults(searchAirports(val));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(true);
    }
  }

  function handleFocus() {
    setBlurredWithoutSelection(false);
    setHighlightedIndex(0);
    setResults(query.length >= 1 ? searchAirports(query) : AIRPORTS.slice(0, 15));
    setOpen(true);
  }

  function handleBlur() {
    setTimeout(() => {
      if (!value && query) setBlurredWithoutSelection(true);
    }, 200);
  }

  // Enter selects whatever is CURRENTLY highlighted in React state — never a
  // mouse-click coordinate that can desync from a list that just reordered
  // (e.g. the dropdown reflowing mid-keystroke), and never the browser's
  // default "submit the form" fallback for Enter in a text input.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || visibleResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % visibleResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + visibleResults.length) % visibleResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const airport = visibleResults[highlightedIndex];
      if (airport) selectAirport(airport);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showError = blurredWithoutSelection && query.length > 0 && !value;

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-ink-muted mb-1">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`input-field ${showError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
      />
      {showError && (
        <p className="text-xs text-red-400 mt-1">Select an airport from the list</p>
      )}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-surface-3 border border-hairline-strong rounded-lg max-h-56 overflow-y-auto animate-fadeInUp" style={{ animationDuration: '0.15s' }}>
          {visibleResults.map((airport, i) => (
            <button
              key={airport.code}
              type="button"
              className={`w-full text-left px-4 py-2.5 border-b border-hairline last:border-0 transition-colors duration-100 ${
                i === highlightedIndex ? 'bg-white/5' : 'hover:bg-white/5'
              }`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => selectAirport(airport)}
            >
              <span className="font-mono font-bold text-brand-400 mr-2">{airport.code}</span>
              <span className="text-sm text-ink-muted">{airport.city}</span>
              <span className="text-xs text-ink-faint ml-1">· {airport.name}</span>
            </button>
          ))}
          {query.length >= 1 && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-ink-faint">No airports found for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}
