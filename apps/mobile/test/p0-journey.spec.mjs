import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activeDashboardAccounts, homeDashboardLayout } from "../src/features/home-dashboard-layout.ts";

const root = join(import.meta.dirname, "..");
const app = readFileSync(join(root, "src", "app", "_layout.tsx"), "utf8");
const home = readFileSync(join(root, "src", "app", "(tabs)", "index.tsx"), "utf8");
const screens = readFileSync(
  join(root, "src", "features", "screens.tsx"),
  "utf8",
);
const authScreen = readFileSync(
  join(root, "src", "features", "auth-screen.tsx"),
  "utf8",
);
const authSubmit = readFileSync(join(root, "src", "features", "auth-submit.ts"), "utf8");
const navigator = readFileSync(
  join(root, "src", "navigation", "RootNavigator.tsx"),
  "utf8",
);

test("mobile P0 journey has auth, setup, dashboard and session restore boundaries", () => {
  assert.match(app, /SessionProvider/);
  assert.match(navigator, /auth\/me/);
  assert.match(navigator, /OnboardingScreen/);
  assert.match(app, /<Stack.Screen name="\(tabs\)"/);
  assert.match(home, /DashboardScreen/);
  assert.match(authScreen, /submitAuth\(/);
  assert.match(authScreen, /getAuthAction\(mode\)/);
  assert.match(authSubmit, /auth\/login/);
  assert.match(screens, /useDashboard/);
  assert.match(screens, /Lukitas/);
  assert.match(screens, /Saldo total/);
  assert.match(screens, /dashboard\.totals\.amount/);
  assert.match(screens, /dashboard\.baseCurrency/);
  assert.match(screens, /dashboard\.flow\.income/);
  assert.match(screens, /dashboard\.flow\.expense/);
  assert.match(screens, /activeDashboardAccounts\(dashboard\)/);
  assert.match(screens, /<ScrollView\s+horizontal/);
  assert.match(screens, /dashboardDisclosure/);
  assert.match(screens, /dashboard\.totals\.warnings/);
  assert.match(screens, /dashboard\.flow\.warnings/);
  assert.match(screens, /href: '\/\(tabs\)\/movimientos'/);
  assert.match(screens, /href: '\/\(tabs\)\/planificacion'/);
  assert.match(screens, /href: '\/\(tabs\)\/ajustes'/);
  assert.match(screens, /href="\/informes"/);
  assert.match(screens, /ActivityIndicator/);
  assert.match(screens, /if \(error\)/);
  assert.match(screens, /accessibilityRole="alert"/);
  assert.match(screens, /Todavía no tienes cuentas activas/);
});

test("home adapts from a phone stack to bounded tablet and desktop columns", () => {
  assert.deepEqual(homeDashboardLayout(375), { wide: false, gutter: 20, contentWidth: 335 });
  assert.deepEqual(homeDashboardLayout(768), { wide: true, gutter: 32, contentWidth: 704 });
  assert.deepEqual(homeDashboardLayout(1440), { wide: true, gutter: 32, contentWidth: 1120 });
  assert.ok(homeDashboardLayout(720).contentWidth <= 720);
  assert.match(screens, /useWindowDimensions\(\)/);
  assert.match(screens, /wide && styles\.columnsWide/);
  assert.match(screens, /wide && styles\.flowWide/);
});

test("home presents only active native-currency accounts", () => {
  const dashboard = {
    accounts: [
      { id: "active", balance: "120.50", currency: { code: "EUR" }, archived: false },
      { id: "archived", balance: "90.00", currency: { code: "USD" }, archived: true },
    ],
  };
  assert.deepEqual(activeDashboardAccounts(dashboard), [dashboard.accounts[0]]);
  assert.match(screens, /account\.balance} {account\.currency\.code}/);
  assert.match(screens, /disclosure\.balance[\s\S]*dashboard\.totals\.warnings/);
  assert.match(screens, /disclosure\.flow[\s\S]*dashboard\.flow\.warnings/);
});

test("home's local dark palette keeps financial text readable without changing auth", () => {
  const palette = screens.match(/const colors = \{([\s\S]*?)\} as const;/)?.[1];
  assert.ok(palette);
  const token = (name) => {
    const color = palette.match(new RegExp(`\\b${name}: '(#[0-9A-Fa-f]{6})'`))?.[1];
    assert.ok(color, `missing home color ${name}`);
    return color;
  };
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (a, b) => {
    const lighter = Math.max(luminance(a), luminance(b));
    const darker = Math.min(luminance(a), luminance(b));
    return (lighter + 0.05) / (darker + 0.05);
  };
  for (const surface of ["canvas", "surface", "raised"]) {
    for (const text of ["ink", "body", "muted", "primary", "warning", "error"]) {
      assert.ok(contrast(token(text), token(surface)) >= 4.5, `${text} on ${surface}`);
    }
  }
  assert.ok(contrast(token("ink"), token("brand")) >= 4.5);
  assert.match(screens, /style=\{\[styles\.center, styles\.canvas\]\}/);
  assert.doesNotMatch(screens, /AUTH_COLORS/);
});
