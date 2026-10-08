import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dashboardDisclosure, reportDisclosure } from '../src/shared/presentation/financial-disclosure.ts';
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
    assert.match(source('cuentas.tsx'), /AccountsScreen/);
    assert.match(source('cuentas.tsx'), /<RootNavigator>/);
    assert.match(source('_layout.tsx'), /<Stack\.Screen name="cuentas" options=\{\{ title: 'Cuentas' \}\} \/>/);
    assert.match(source('index.tsx'), /RootNavigator/);
    assert.match(tabs, /<RootNavigator>/);
  });
});

describe('web navigation routes', () => {
  it('registers the tab list directly under Tabs so Expo Router discovers its screens', () => {
    const tabs = source('(tabs)/_layout.web.tsx');
    const stack: string[] = [];
    const directLists: string[] = [];
    let directTriggers = 0;
    // Match the layout's JSX tags in document order and check parentage, not mere presence.
    for (const [, closing, name, tail] of tabs.matchAll(/<(\/)?([A-Z][A-Za-z]*)\b([^>]*?)>/g)) {
      if (closing) {
        assert.equal(stack.pop(), name, `unexpected closing tag for ${name}`);
      } else {
        if (name === 'TabList' && stack.at(-1) === 'Tabs') directLists.push(name);
        if (name === 'TabTrigger' && stack.at(-1) === 'TabList' && stack.at(-2) === 'Tabs') directTriggers++;
        if (!tail.trimEnd().endsWith('/')) stack.push(name);
      }
    }
    assert.deepEqual(stack, [], 'JSX tags should be balanced');
    assert.equal(directLists.length, 1, 'TabList must be an immediate child of Tabs for Expo Router route discovery');
    assert.equal(directTriggers, 4, 'four destinations must be direct TabTriggers in the registered TabList');
  });

  it('uses a guarded headless tab shell with four real, named destinations', () => {
    const tabs = source('(tabs)/_layout.web.tsx');
    assert.match(tabs, /<RootNavigator>/);
    assert.match(tabs, /<Tabs\b/);
    assert.match(tabs, /<TabSlot\b/);
    assert.match(tabs, /<TabList\b/);
    for (const [name, href, label] of [
      ['index', '/(tabs)', 'Inicio'],
      ['movimientos', '/(tabs)/movimientos', 'Movimientos'],
      ['planificacion', '/(tabs)/planificacion', 'Planificación'],
      ['ajustes', '/(tabs)/ajustes', 'Ajustes'],
    ]) {
      assert.ok(tabs.includes(`<TabTrigger name="${name}" href="${href}"`));
      assert.match(tabs, new RegExp(`accessibilityLabel="${label}"`));
      assert.match(source(`(tabs)/${name}.tsx`), /export default/);
    }
    assert.equal((tabs.match(/<TabTrigger name=/g) ?? []).length, 4);
    assert.match(tabs, /isFocused/);
    assert.match(tabs, /styles\.tabList/);
    assert.match(tabs, /<Pressable\s+\{\.\.\.props\}/);
    assert.match(tabs, /accessibilityState=\{\{ selected: isFocused \}\}/);
    assert.doesNotMatch(tabs, /NativeTabs/);
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
