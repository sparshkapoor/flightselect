interface DatePickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  required?: boolean;
}

export function DatePicker({ label, value, onChange, min, required }: DatePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        min={min ?? new Date().toISOString().split('T')[0]}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input-field"
      />
    </div>
  );
}
