type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatter = (timezone: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

const partsAt = (value: Date, timezone: string): ZonedParts => {
  const parts = formatter(timezone).formatToParts(value);
  const number = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: number('year'), month: number('month'), day: number('day'), hour: number('hour'), minute: number('minute'), second: number('second') };
};

const asUtc = (parts: ZonedParts) => Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

// Iteration resolves the timezone offset at the requested wall-clock time, including DST changes.
export const zonedDateTimeToUtc = (parts: ZonedParts, timezone: string): Date => {
  const intended = asUtc(parts);
  let candidate = intended;
  for (let index = 0; index < 3; index += 1) candidate += intended - asUtc(partsAt(new Date(candidate), timezone));
  return new Date(candidate);
};

export const startOfMonthInTimezone = (value: Date, timezone: string): Date => {
  const local = partsAt(value, timezone);
  return zonedDateTimeToUtc({ ...local, day: 1, hour: 0, minute: 0, second: 0 }, timezone);
};

export const dashboardPeriod = (timezone: string, from?: string, to?: string, clock = new Date()) => ({
  from: from ? new Date(from) : startOfMonthInTimezone(clock, timezone),
  to: to ? new Date(to) : clock,
});
