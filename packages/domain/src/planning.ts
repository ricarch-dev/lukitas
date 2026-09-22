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

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function formatter(timezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new RangeError('Unsupported timezone');
  }
}

function partsAt(value: Date, timezone: string): ZonedParts {
  const parts = formatter(timezone).formatToParts(value);
  const number = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: number('year'),
    month: number('month'),
    day: number('day'),
    hour: number('hour'),
    minute: number('minute'),
    second: number('second'),
  };
}

function monthStart(year: number, month: number, timezone: string): Date {
  const intended = Date.UTC(year, month - 1, 1);
  let candidate = intended;
  for (let index = 0; index < 3; index += 1) {
    const local = partsAt(new Date(candidate), timezone);
    const represented = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    candidate += intended - represented;
  }
  return new Date(candidate);
}

export function monthBounds(month: string, timezone: string): { from: Date; to: Date } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError('month must be YYYY-MM');
  const [year, monthNumber] = month.split('-').map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    from: monthStart(year, monthNumber, timezone),
    to: monthStart(nextYear, nextMonth, timezone),
  };
}
