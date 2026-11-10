import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'src', 'modules');
const home = readFileSync(join(root, 'home', 'screens', 'dashboard-screen.tsx'), 'utf8');
const menu = readFileSync(join(root, 'home', 'components', 'quick-actions-menu.tsx'), 'utf8');
const movements = readFileSync(join(root, 'movements', 'screens', 'movements-screen.tsx'), 'utf8');

test('home plus transforms into the close control while options rise without a dimming modal', () => {
  assert.match(home, /<QuickActionsMenu gutter=\{gutter\}/);
  assert.match(menu, /accessibilityState=\{\{ expanded: visible \}\}/);
  assert.match(menu, /accessibilityLabel=\{visible \? 'Cerrar acciones' : 'Abrir acciones'\}/);
  assert.match(menu, /Animated\.timing/);
  assert.match(menu, /rotate:/);
  assert.match(menu, /translateY:/);
  assert.match(menu, /isReduceMotionEnabled/);
  assert.doesNotMatch(menu, /<Modal|backgroundColor: 'rgba/);
  assert.doesNotMatch(menu, /<X\b/);
  assert.match(menu, /accessibilityLabel="Cerrar menú de acciones"/);
  assert.match(menu, /onPress=\{close\}/);
});

test('quick actions link to existing account, movement and transfer workflows without placeholder actions', () => {
  assert.match(menu, /Crear cuenta/);
  assert.match(menu, /Nuevo movimiento/);
  assert.match(menu, /Nueva transferencia/);
  assert.match(menu, /router\.push\('\/crear-cuenta'\)/);
  assert.match(menu, /destination === 'transfer' \? 'TRANSFER' : 'EXPENSE'/);
  assert.match(movements, /useLocalSearchParams/);
  assert.match(movements, /create === 'TRANSFER' \|\| create === 'EXPENSE'/);
  assert.match(movements, /router\.setParams\(\{ create: undefined \}\)/);
  assert.match(movements, /onPress=\{\(\) => setForm\('EXPENSE'\)\}/);
  assert.match(movements, /onPress=\{\(\) => setForm\('TRANSFER'\)\}/);
});
