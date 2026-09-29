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
  assert.match(screens, /Saldo en/);
  assert.match(screens, /dashboardDisclosure/);
  assert.match(screens, /href="\/informes"/);
});
