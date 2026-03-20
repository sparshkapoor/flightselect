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
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display when value prop changes externally (e.g., reset)
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

    // Clear the selected code — user is editing, they need to pick again
    if (value) {
      onChange('');
    }

    if (val.length >= 1) {
      setResults(searchAirports(val));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(true); // show full list on empty
    }
  }

  function handleFocus() {
    setBlurredWithoutSelection(false);
    if (query.length >= 1) {
      setResults(searchAirports(query));
    } else {
      setResults(AIRPORTS.slice(0, 15));
    }
    setOpen(true);
  }

  function handleBlur() {
    // Delay to allow click events on dropdown items to fire
    setTimeout(() => {
      if (!value && query) {
        setBlurredWithoutSelection(true);
      }
    }, 200);
  }

  const showError = blurredWithoutSelection && query.length > 0 && !value;

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`input-field ${showError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
      />
      {showError && (
        <p className="text-xs text-red-500 mt-1">Select an airport from the list</p>
      )}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {(results.length > 0 ? results : (query.length === 0 ? AIRPORTS.slice(0, 15) : [])).map((airport) => (
            <button
              key={airport.code}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              onClick={() => selectAirport(airport)}
            >
              <span className="font-mono font-bold text-brand-700 mr-2">{airport.code}</span>
              <span className="text-sm text-gray-700">{airport.city}</span>
              <span className="text-xs text-gray-400 ml-1">· {airport.name}</span>
            </button>
          ))}
          {query.length >= 1 && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No airports found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
