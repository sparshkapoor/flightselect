import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-700">
          <span className="text-2xl">✈️</span>
          <span>FlightSelect</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-brand-600 transition-colors">Search</Link>
          <Link to="/saved" className="hover:text-brand-600 transition-colors">Saved</Link>
          <Link to="/settings" className="hover:text-brand-600 transition-colors">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
