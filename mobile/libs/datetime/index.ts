export class DateTimeService {
  private static locale: string = 'en-US';

  static setLocale(locale: string) {
    this.locale = locale;
  }

  static getLocale(): string {
    return this.locale;
  }

  private static ensureDate(date: Date | string): Date {
    return typeof date === 'string' ? new Date(date) : date;
  }

  /**
   * Formats a Date object or string into a string based on the provided format string.
   * Supported tokens:
   * YYYY - Full year
   * MM - Month (01-12)
   * DD - Day of month (01-31)
   * HH - Hours (00-23)
   * mm - Minutes (00-59)
   * ss - Seconds (00-59)
   *
   * @param date The date to format (Date object or ISO string)
   * @param formatStr The format string (default: 'YYYY-MM-DD')
   */
  static format(date: Date | string, formatStr: string = 'YYYY-MM-DD'): string {
    const d = this.ensureDate(date);
    const map: Record<string, string> = {
      YYYY: d.getFullYear().toString(),
      MMMM: d.toLocaleString(this.locale, { month: 'long' }),
      MMM: d.toLocaleString(this.locale, { month: 'short' }),
      MM: (d.getMonth() + 1).toString().padStart(2, '0'),
      DD: d.getDate().toString().padStart(2, '0'),
      HH: d.getHours().toString().padStart(2, '0'),
      mm: d.getMinutes().toString().padStart(2, '0'),
      ss: d.getSeconds().toString().padStart(2, '0'),
    };

    return formatStr.replace(/YYYY|MMMM|MMM|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
  }

  /**
   * Formats a date using Intl.DateTimeFormat
   */
  static formatLocalized(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale, options).format(this.ensureDate(date));
  }

  /**
   * Returns a relative time string (e.g., "2 hours ago", "in 5 minutes")
   */
  static toRelative(date: Date | string): string {
    const d = this.ensureDate(date);
    const now = new Date();
    const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });

    const intervals: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
      { unit: 'year', seconds: 31536000 },
      { unit: 'month', seconds: 2592000 },
      { unit: 'week', seconds: 604800 },
      { unit: 'day', seconds: 86400 },
      { unit: 'hour', seconds: 3600 },
      { unit: 'minute', seconds: 60 },
      { unit: 'second', seconds: 1 },
    ];

    for (const { unit, seconds } of intervals) {
      const value = Math.floor(Math.abs(diffInSeconds) / seconds);
      if (value >= 1) {
        return rtf.format(diffInSeconds > 0 ? value : -value, unit);
      }
    }

    return rtf.format(0, 'second'); // "now"
  }

  /**
   * Checks if a date is today
   */
  static isToday(date: Date | string): boolean {
    const d = this.ensureDate(date);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Formats to YYYY-MM-DD
   */
  static formatDate(date: Date | string): string {
    return this.format(date, 'YYYY-MM-DD');
  }

  /**
   * Formats to HH:mm
   */
  static formatTime(date: Date | string): string {
    return this.format(date, 'HH:mm');
  }
}
