import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dashboardDisclosure, reportDisclosure } from '../src/features/financial-disclosure.ts';
import type { DashboardDto, FinancialReportDto } from '@lukitas/contracts';

const source = (relative: string) => readFileSync(fileURLToPath(new URL(`../src/app/${relative}`, import.meta.url)), 'utf8');

describe('native navigation routes', () => {
  it('declares exactly four reachable tab routes with platform icons and contextual reports', () => {
    const tabs = source('(tabs)/_layout.tsx');
    for (const route of ['index', 'movimientos', 'planificacion', 'ajustes']) {
      assert.match(tabs, new RegExp(`name="${route}"`));
      assert.match(source(`(tabs)/${route}.tsx`), /export default/);
    }
    assert.equal((tabs.match(/<NativeTabs.Trigger name=/g) ?? []).length, 4);
    assert.equal((tabs.match(/\.Trigger\.Icon sf=/g) ?? []).length, 4);
    assert.match(source('informes.tsx'), /ReportsScreen/);
    assert.match(source('index.tsx'), /RootNavigator/);
    assert.match(tabs, /<RootNavigator>/);
  });
});

describe('financial disclosures', () => {
  it('marks both partial dashboard aggregates independently without changing their values', () => {
    const dashboard: DashboardDto = {
      baseCurrency: 'USD', accounts: [], recentActivity: [],
      totals: { amount: '100', partial: true, warnings: [] },
      flow: { income: '20', expense: '5', partial: false, warnings: [] },
    };
    assert.ok(dashboardDisclosure(dashboard).balance);
    assert.equal(dashboardDisclosure(dashboard).flow, null);
    assert.equal(dashboard.totals.amount, '100');
  });
  it('does not present an incomplete report as a net total', () => {
    const report: FinancialReportDto = {
      from: '2026-09-01', to: '2026-10-01', items: [], nativeTotals: {},
      warnings: [], affectedIds: [], partial: true, baseCurrency: 'USD', baseTotal: '18',
    };
    assert.equal(reportDisclosure(report).total, null);
    assert.ok(reportDisclosure(report).warning);
    assert.equal(reportDisclosure({ ...report, partial: false }).total, 'Total neto: 18 USD');
    assert.equal(reportDisclosure({ ...report, partial: false, baseTotal: undefined }).total, null);
  });
});
