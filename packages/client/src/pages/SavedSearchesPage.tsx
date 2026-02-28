import { EmptyState } from '../components/common/EmptyState';

export function SavedSearchesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Searches</h1>
      <EmptyState
        title="No saved searches yet"
        description="Search for flights and save them to track price changes."
        icon="🔖"
      />
    </div>
  );
}
