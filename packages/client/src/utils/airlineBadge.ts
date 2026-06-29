const FIRST_LETTER_COLORS: Record<string, string> = {
  A: 'bg-blue-500/10 text-blue-400',
  B: 'bg-indigo-500/10 text-indigo-400',
  C: 'bg-cyan-500/10 text-cyan-400',
  D: 'bg-sky-500/10 text-sky-400',
  E: 'bg-green-500/10 text-green-400',
  F: 'bg-teal-500/10 text-teal-400',
  J: 'bg-amber-500/10 text-amber-400',
  S: 'bg-rose-500/10 text-rose-400',
  U: 'bg-purple-500/10 text-purple-400',
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
  return FIRST_LETTER_COLORS[key] ?? 'bg-brand-500/10 text-brand-400';
}
