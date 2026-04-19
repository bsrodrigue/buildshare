/**
 * Formats a date string or Date object into a short format "DD MMM" (e.g., 21 Mar).
 */
export function formatTimelineDate(date: string | Date, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  // Custom format: 21 Mar
  const day = d.getDate();
  const month = d.toLocaleString(locale, { month: 'short' });

  return `${day} ${month}`;
}
