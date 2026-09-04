import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const app = readFileSync(join(root, 'App.tsx'), 'utf8');
const screens = readFileSync(join(root, 'src', 'features', 'screens.tsx'), 'utf8');
const navigator = readFileSync(join(root, 'src', 'navigation', 'RootNavigator.tsx'), 'utf8');

test('mobile P0 journey has auth, setup, dashboard and session restore boundaries', () => {
  assert.match(app, /SessionProvider/);
  assert.match(navigator, /auth\/me/);
  assert.match(navigator, /OnboardingScreen/);
  assert.match(navigator, /DashboardScreen/);
  assert.match(screens, /auth\/login/);
  assert.match(screens, /onboarding/);
  assert.match(screens, /dashboard/);
});
