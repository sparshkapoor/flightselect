import { useUserStore } from '../stores/userStore';
import { AirportInput } from '../components/search/AirportInput';

export function SettingsPage() {
  const store = useUserStore();

  function updateUser(patch: { homeAirport?: string; preferredCurrency?: string }) {
    store.setUser({ id: store.userId ?? '', email: store.email ?? '', ...patch });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="card space-y-4">
        <div className="max-w-xs">
          <AirportInput
            label="Home Airport"
            value={store.homeAirport ?? ''}
            onChange={(code) => updateUser({ homeAirport: code })}
            placeholder="e.g. SFO"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Currency</label>
          <select
            value={store.preferredCurrency}
            onChange={(e) => updateUser({ preferredCurrency: e.target.value })}
            className="input-field w-32"
          >
            {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
