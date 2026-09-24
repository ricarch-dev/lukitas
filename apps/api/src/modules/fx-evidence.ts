import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
import type { PrismaService } from '../common/prisma.js';
import { decimalText, storedRate } from './p0-finance.js';

export type SelectedFxEvidence = {
  readonly baseCode: SupportedMonetaryUnitCode;
  readonly quoteCode: SupportedMonetaryUnitCode;
  readonly rate: string;
  readonly source: 'MARKET' | 'MANUAL';
  readonly effectiveAt: Date;
};

// Only the requested direction and rows effective by the operation instant qualify.
export const selectFxEvidence = async (
  prisma: Pick<PrismaService, 'fxRate'>,
  baseCode: SupportedMonetaryUnitCode,
  quoteCode: SupportedMonetaryUnitCode,
  occurredAt: Date,
  manualRate?: unknown,
): Promise<SelectedFxEvidence | null> => {
  if (manualRate !== undefined) {
    return { baseCode, quoteCode, rate: storedRate(manualRate), source: 'MANUAL', effectiveAt: occurredAt };
  }
  const row = await prisma.fxRate.findFirst({
    where: { baseCode, quoteCode, effectiveAt: { lte: occurredAt } },
    orderBy: { effectiveAt: 'desc' },
  });
  return row
    ? { baseCode, quoteCode, rate: storedRate(decimalText(row.rate)),
        source: row.source, effectiveAt: row.effectiveAt }
    : null;
};
