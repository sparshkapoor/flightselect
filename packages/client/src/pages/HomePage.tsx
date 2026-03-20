import { SearchForm } from '../components/search/SearchForm';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-4">
            ✈️ FlightSelect
          </h1>
          <p className="text-xl text-blue-100">
            Should you book round-trip or two one-way tickets?
          </p>
        </div>
        <SearchForm />
      </div>
    </div>
  );
}
