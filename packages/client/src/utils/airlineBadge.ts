const FIRST_LETTER_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-indigo-100 text-indigo-700',
  C: 'bg-cyan-100 text-cyan-700',
  D: 'bg-sky-100 text-sky-700',
  E: 'bg-green-100 text-green-700',
  F: 'bg-teal-100 text-teal-700',
  J: 'bg-amber-100 text-amber-700',
  S: 'bg-rose-100 text-rose-700',
  U: 'bg-purple-100 text-purple-700',
};

export function airlineInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function airlineColor(name: string): string {
  const key = name[0]?.toUpperCase() ?? '';
  return FIRST_LETTER_COLORS[key] ?? 'bg-brand-100 text-brand-700';
}
