import { SearchForm } from '../components/search/SearchForm';

export function HomePage() {
  return (
    <div className="min-h-screen bg-canvas relative overflow-hidden">
      {/* Single ambient glow — real travel distance + opacity pulse, see
          DESIGN.md "Motion". One glow, not a field of static blobs. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-brand-600 rounded-full blur-3xl animate-ambientDrift" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-20 sm:py-28 relative">
        <div className="text-center mb-10 animate-fadeInUp">
          <div className="text-eyebrow text-brand-400 mb-4">FlightSelect</div>
          <h1 className="text-[2.75rem] sm:text-[3.25rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink mb-5 max-w-2xl mx-auto">
            Should you book round-trip or two one-way tickets?
          </h1>
          <p className="text-lg text-ink-cool">
            Compare both, see the real price difference, book in one click.
          </p>
        </div>
        <div className="animate-fadeInUp" style={{ animationDelay: '120ms' }}>
          <SearchForm />
        </div>
      </div>
    </div>
  );
}
