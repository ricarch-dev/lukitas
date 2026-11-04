import { Injectable } from '@nestjs/common';
import { Currency, FxRate } from '@lukitas/domain';
import { PrismaService } from '../../common/prisma.js';

const BASE_URL = 'https://ve.dolarapi.com/v1';
const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
const usd = Currency.of('USD', 2);
const ves = Currency.of('VES', 2);

type FetchQuote = typeof fetch;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function quote(value: unknown, dateField: 'fecha' | 'fechaActualizacion', cutoff: Date) {
  const data = record(value);
  if (!data || typeof data.promedio !== 'number' || !Number.isFinite(data.promedio) ||
      data.promedio <= 0 || typeof data[dateField] !== 'string') return null;
  const rawDate = data[dateField];
  // Historical data only gives a calendar date. Treat it as midnight UTC, not the download time.
  if (dateField === 'fecha' && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(rawDate)) return null;
  const effectiveAt = new Date(rawDate);
  if (!Number.isFinite(effectiveAt.getTime()) || effectiveAt > cutoff) return null;
  if (dateField === 'fecha' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
      effectiveAt.toISOString().slice(0, 10) !== rawDate) return null;
  const rate = data.promedio.toString();
  if (/e/i.test(rate)) return null;
  try {
    const direct = FxRate.of(usd, ves, rate);
    const inverse = direct.invert({ precision: 12, mode: 'HALF_UP' });
    if (inverse.rate === '0.000000000000') return null;
    return { effectiveAt, direct: direct.rate, inverse: inverse.rate };
  } catch {
    return null;
  }
}

@Injectable()
export class BcvRateSync {
  private readonly attempted = new Map<string, number>();
  private readonly pending = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService) {}

  async refresh(current: Date, previousCutoff: Date, fetchQuote: FetchQuote = fetch): Promise<void> {
    // The prior day's published quote is guaranteed to precede the historical cutoff.
    const previousDay = new Date(previousCutoff.getTime() - 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    await Promise.all([
      this.sync(`${BASE_URL}/historicos/dolares/oficial/${previousDay.replaceAll('-', '/')}`,
        'fecha', previousCutoff, current, fetchQuote),
      this.sync(`${BASE_URL}/dolares/oficial`, 'fechaActualizacion', current, current, fetchQuote),
    ]);
  }

  private async sync(url: string, dateField: 'fecha' | 'fechaActualizacion', cutoff: Date,
    now: Date, fetchQuote: FetchQuote): Promise<void> {
    const inFlight = this.pending.get(url);
    if (inFlight) return inFlight;
    if (now.getTime() - (this.attempted.get(url) ?? -Infinity) < REFRESH_INTERVAL_MS) return;
    this.attempted.set(url, now.getTime());
    const run = (async () => {
      try {
        const response = await fetchQuote(url, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) return;
        const selected = quote(await response.json() as unknown, dateField, cutoff);
        if (!selected) return;
        for (const [baseCode, quoteCode, rate] of [
          ['USD', 'VES', selected.direct], ['VES', 'USD', selected.inverse],
        ] as const) {
          const where = { baseCode, quoteCode, effectiveAt: selected.effectiveAt };
          await this.prisma.$transaction(async (tx) => {
            // Serialize this publication across API processes without altering existing FX rows.
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${baseCode}/${quoteCode}/${selected.effectiveAt.toISOString()}`}))::text`;
            if (!await tx.fxRate.findFirst({ where }))
              await tx.fxRate.create({ data: { ...where, rate, source: 'MARKET' } });
          });
        }
      } catch {
        // Preserve the existing partial-balance warning when the upstream service is unavailable.
      }
    })();
    this.pending.set(url, run);
    try { await run; } finally { this.pending.delete(url); }
  }
}
