export type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export function normalizeCategoryName(name: string): string {
  const value = name.trim().replace(/\s+/g, ' ');
  if (!value || value.length > 80)
    throw new RangeError('Category name must contain 1-80 characters');
  return value.toLocaleLowerCase();
}

export function monthKeyAt(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}`;
}

export function nextOccurrenceAt(value: Date, cadence: Cadence): Date {
  const next = new Date(value);
  if (cadence === 'DAILY') next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
}

export function monthBounds(month: string, timezone: string): { from: Date; to: Date } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError('month must be YYYY-MM');
  const [year, monthNumber] = month.split('-').map(Number);
  const offsetDate = (day: number) => {
    const local = new Date(Date.UTC(year, monthNumber - 1, day));
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(local);
    const offset = formatted.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(offset);
    const minutes = match
      ? (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === '+' ? 1 : -1)
      : 0;
    return new Date(local.getTime() - minutes * 60_000);
  };
  return {
    from: offsetDate(1),
    to: offsetDate(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()),
  };
}
