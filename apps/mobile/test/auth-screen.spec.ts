import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ApiError } from '../src/api/client.ts';
import {
  getAuthAction,
  getAuthErrorMessage,
  getOtherAuthMode,
  type AuthMode,
} from '../src/features/auth-screen-logic.ts';
import { AUTH_COLORS } from '../src/features/auth-screen-theme.ts';

const screenSource = readFileSync(new URL('../src/features/auth-screen.tsx', import.meta.url), 'utf8');

function relativeLuminance(hex: string): number {
  const channels = [0, 1, 2].map((index) => {
    const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

test('auth mode selection maps to the existing login and registration actions', () => {
  assert.equal(getAuthAction('sign-in'), 'login');
  assert.equal(getAuthAction('create-account'), 'register');
  assert.equal(getOtherAuthMode('sign-in'), 'create-account');
  assert.equal(getOtherAuthMode('create-account'), 'sign-in');
  assert.match(screenSource, /onPress=\{selectMode\('sign-in'\)\}/);
  assert.match(screenSource, /onPress=\{selectMode\('create-account'\)\}/);
  assert.match(screenSource, /submitAuth\(\s*getAuthAction\(mode\),\s*\{ email, password \}/);
});

test('auth errors use actionable Spanish copy for local validation', () => {
  const mode: AuthMode = 'create-account';
  assert.equal(getAuthErrorMessage(new Error('A valid email is required'), mode), 'Ingresa un correo electrónico válido.');
  assert.equal(getAuthErrorMessage(new Error('Password must contain at least 8 characters'), mode), 'La contraseña debe tener al menos 8 caracteres.');
  assert.equal(getAuthErrorMessage(new Error('Password is required'), mode), 'Ingresa tu contraseña.');
});

test('auth errors explain duplicate accounts, rejected credentials, and connectivity', () => {
  assert.match(
    getAuthErrorMessage(new ApiError('CONFLICT', 'Unable to create account', 409), 'create-account'),
    /Ya existe una cuenta con este correo/,
  );
  assert.match(
    getAuthErrorMessage(new ApiError('UNAUTHORIZED', 'Invalid credentials', 401), 'sign-in'),
    /no coinciden/,
  );
  assert.match(
    getAuthErrorMessage(new TypeError('Network request failed'), 'sign-in'),
    /Comprueba tu conexión/,
  );
});

test('unknown server details are not exposed to users', () => {
  const message = getAuthErrorMessage(
    new ApiError('INTERNAL_ERROR', 'Database connection string leaked', 500),
    'create-account',
  );
  assert.equal(message, 'No pudimos completar la solicitud en este momento. Inténtalo más tarde.');
  assert.doesNotMatch(message, /Database connection string/);
});

test('auth palette maintains readable text and control contrast', () => {
  assert.ok(contrastRatio(AUTH_COLORS.ink, AUTH_COLORS.surface) >= 7);
  assert.ok(contrastRatio(AUTH_COLORS.body, AUTH_COLORS.surface) >= 4.5);
  assert.ok(contrastRatio(AUTH_COLORS.muted, AUTH_COLORS.surface) >= 3.5);
  assert.ok(contrastRatio(AUTH_COLORS.primary, AUTH_COLORS.surface) >= 4.5);
  assert.ok(contrastRatio(AUTH_COLORS.disabled, AUTH_COLORS.surface) >= 4.5);
  assert.ok(contrastRatio(AUTH_COLORS.fieldBorder, AUTH_COLORS.surface) >= 3);
  assert.ok(contrastRatio(AUTH_COLORS.error, AUTH_COLORS.errorSurface) >= 4.5);
});

test('auth form keeps passwords hidden by default and exposes busy state accessibly', () => {
  assert.match(screenSource, /const \[passwordVisible, setPasswordVisible\] = useState\(false\)/);
  assert.match(screenSource, /secureTextEntry=\{!passwordVisible\}/);
  assert.match(screenSource, /accessibilityState=\{\{ busy: isSubmitting, disabled: isSubmitting \}\}/);
  assert.match(screenSource, /onFocus=\{\(\) => setFocusedControl\('submit'\)\}/);
  assert.match(screenSource, /focusedControl === 'submit' \? styles\.controlFocused/);
  assert.match(screenSource, /accessibilityRole="alert"/);
});
