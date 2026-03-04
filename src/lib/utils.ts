import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

export function scoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Needs Work';
  return 'Poor';
}

export function impactColor(impact: string): string {
  if (impact === 'High') return 'bg-red-100 text-red-700 border-red-200';
  if (impact === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function effortColor(effort: string): string {
  if (effort === 'Low') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (effort === 'Medium') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-purple-100 text-purple-700 border-purple-200';
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    SEO: 'bg-blue-100 text-blue-700',
    CRO: 'bg-emerald-100 text-emerald-700',
    Performance: 'bg-amber-100 text-amber-700',
    Technical: 'bg-purple-100 text-purple-700',
    Content: 'bg-pink-100 text-pink-700',
    Messaging: 'bg-indigo-100 text-indigo-700',
    Accessibility: 'bg-teal-100 text-teal-700',
  };
  return map[category] ?? 'bg-slate-100 text-slate-700';
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

// Shared trust signal detection — pure function, usable in client components
const TRUST_PATTERN =
  /\b(guarantee|money.back|secure|trusted|certified|award|verified|ssl|reviews?|testimonials?|years? experience|clients?|customers?|compliance|iso|soc.?2|gdpr|privacy)\b/i;

export function hasTrustSignals(
  pages: { h1: string[]; h2: string[]; ctaCandidates: string[] }[]
): boolean {
  const allText = pages.flatMap((p) => [...p.h1, ...p.h2, ...p.ctaCandidates]).join(' ');
  return TRUST_PATTERN.test(allText);
}
