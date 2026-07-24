/** Human-readable elapsed time from an ISO 8601 string, Date, or null. */
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return '';
  const then = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return then.toLocaleDateString();
}

/** Safe string fallback — returns empty string for null/undefined */
export function safe(v: string | null | undefined): string {
  return v ?? '';
}
