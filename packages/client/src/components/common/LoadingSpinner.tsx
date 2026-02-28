interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizeClasses[size]} border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
