export function Footer() {
  return (
    <footer className="bg-canvas border-t border-hairline mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-sm text-ink-faint">
        <span>© {new Date().getFullYear()} FlightSelect</span>
        <span>Flight data is for demonstration purposes only.</span>
      </div>
    </footer>
  );
}
