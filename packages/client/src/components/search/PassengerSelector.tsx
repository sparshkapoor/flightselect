interface PassengerSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

export function PassengerSelector({ value, onChange }: PassengerSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-muted mb-1">Passengers</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-hairline flex items-center justify-center hover:bg-surface-2 hover:border-hairline-strong text-ink font-bold transition-colors duration-150"
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </button>
        <span className="text-lg font-semibold font-mono w-6 text-center tabular-nums">{value}</span>
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-hairline flex items-center justify-center hover:bg-surface-2 hover:border-hairline-strong text-ink font-bold transition-colors duration-150"
          onClick={() => onChange(Math.min(9, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
