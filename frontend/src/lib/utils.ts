import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const categoryColors: Record<string, string> = {
  'Programming':              'bg-blue-500/10 text-blue-500',
  'Web Development':          'bg-purple-500/10 text-purple-500',
  'Data Science':             'bg-green-500/10 text-green-500',
  'Design':                   'bg-pink-500/10 text-pink-500',
  'Artificial Intelligence':  'bg-orange-500/10 text-orange-500',
  'Cloud Computing':          'bg-cyan-500/10 text-cyan-500',
  'Cybersecurity':            'bg-red-500/10 text-red-500',
  'DevOps':                   'bg-yellow-500/10 text-yellow-500',
};

export const categoryGradients: Record<string, string> = {
  'Programming':              'from-blue-500 to-blue-700',
  'Web Development':          'from-purple-500 to-purple-700',
  'Data Science':             'from-green-500 to-green-700',
  'Design':                   'from-pink-500 to-pink-700',
  'Artificial Intelligence':  'from-orange-500 to-orange-700',
  'Cloud Computing':          'from-cyan-500 to-cyan-700',
  'Cybersecurity':            'from-red-500 to-red-700',
  'DevOps':                   'from-yellow-500 to-yellow-700',
};

export function getCategoryColor(category: string): string {
  return categoryColors[category] ?? 'bg-brand/10 text-brand';
}

export function getCategoryGradient(category: string): string {
  return categoryGradients[category] ?? 'from-brand to-brand/70';
}

export function formatRating(avg: number | null | undefined): string {
  if (avg == null) return '';
  return avg.toFixed(1);
}

export function renderStars(rating: number): { full: number; half: boolean; empty: number } {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}
