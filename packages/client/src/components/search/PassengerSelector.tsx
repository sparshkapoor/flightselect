interface PassengerSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

export function PassengerSelector({ value, onChange }: PassengerSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 font-bold"
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </button>
        <span className="text-lg font-semibold w-6 text-center">{value}</span>
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 font-bold"
          onClick={() => onChange(Math.min(9, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
