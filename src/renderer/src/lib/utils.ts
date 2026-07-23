import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Seconds -> "MM:SS". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

/** "MM:SS" (or "HH:MM:SS") -> seconds. */
export function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Absolute offset in ms -> the "MM:SS" label shown next to a transcript turn. */
export function msToTime(ms: number): string {
  return formatDuration(ms / 1000);
}

/** The meeting date line, e.g. "Mar 5 // 2:30 PM". */
export function formatMeetingDate(createdAt: number): string {
  const date = new Date(createdAt);
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' // ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}
