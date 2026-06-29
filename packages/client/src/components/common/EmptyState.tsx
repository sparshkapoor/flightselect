interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
}

export function EmptyState({ title, description, icon = '✈️' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-h2 text-ink-muted mb-2">{title}</h3>
      {description && <p className="text-ink-faint max-w-md">{description}</p>}
    </div>
  );
}
