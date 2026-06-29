import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-canvas border-b border-hairline sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-base text-ink tracking-tight">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
          <span>FlightSelect</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-ink-subtle">
          <Link to="/" className="hover:text-brand-400 transition-colors duration-150">Search</Link>
          <Link to="/saved" className="hover:text-brand-400 transition-colors duration-150">Saved</Link>
          <Link to="/settings" className="hover:text-brand-400 transition-colors duration-150">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
