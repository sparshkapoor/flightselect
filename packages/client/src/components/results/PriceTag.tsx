import { formatPrice } from '../../utils/formatters';

interface PriceTagProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
}

export function PriceTag({ amount, currency = 'USD', size = 'md', highlight }: PriceTagProps) {
  const sizeClasses = {
    sm: 'text-base font-semibold',
    md: 'text-xl font-bold',
    lg: 'text-3xl font-bold',
  };
  return (
    <span className={`${sizeClasses[size]} ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
      {formatPrice(amount, currency)}
    </span>
  );
}
