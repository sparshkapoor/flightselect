export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-sm text-gray-500">
        <span>© {new Date().getFullYear()} FlightSelect</span>
        <span>Flight data is for demonstration purposes only.</span>
      </div>
    </footer>
  );
}
