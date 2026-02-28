import { useState, useRef, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { searchAirports, type Airport } from '../../utils/airportData';

interface AirportInputProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  label?: string;
}

export function AirportInput({ value, onChange, placeholder = 'Airport', label }: AirportInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setResults(searchAirports(debouncedQuery));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [debouncedQuery]);

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
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value) onChange('');
        }}
        placeholder={placeholder}
        className="input-field"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((airport) => (
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
        </div>
      )}
    </div>
  );
}
