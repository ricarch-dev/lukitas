import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  assert.match(screens, /dashboard\.accounts\.filter/);
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
