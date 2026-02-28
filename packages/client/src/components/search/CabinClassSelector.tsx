import { CabinClass } from '@flightselect/shared';
import { CABIN_CLASS_LABELS } from '../../utils/constants';

interface CabinClassSelectorProps {
  value: CabinClass;
  onChange: (v: CabinClass) => void;
}

export function CabinClassSelector({ value, onChange }: CabinClassSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Cabin Class</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CabinClass)}
        className="input-field"
      >
        {Object.values(CabinClass).map((c) => (
          <option key={c} value={c}>
            {CABIN_CLASS_LABELS[c]}
          </option>
        ))}
      </select>
    </div>
  );
}
