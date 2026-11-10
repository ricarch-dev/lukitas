import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const manifest = JSON.parse(read('../package.json'));
const require = createRequire(new URL('../package.json', import.meta.url));
const run = (args) =>
  spawnSync(process.execPath, [require.resolve('expo/bin/cli'), ...args], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    encoding: 'utf8',
    env: { ...process.env, EXPO_OFFLINE: '1' },
  });

test('starts in Expo Go on LAN without the unsupported non-interactive option', () => {
  assert.equal(manifest.scripts.start, 'expo start --go --lan --port 19006');
  assert.equal(manifest.scripts['start:web'], 'expo start --web --port 19006');
});

test('targets the iPhone Expo Go SDK 58 and its stable native tabs entrypoint', () => {
  assert.match(manifest.dependencies.expo, /^58\./);
  assert.match(read('../src/app/(tabs)/_layout.tsx'), /from 'expo-router\/native-tabs'/);
});

test('uses the Expo-managed Babel preset without an unresolved custom preset', () => {
  assert.equal(existsSync(new URL('../babel.config.cjs', import.meta.url)), false);
});

test('installed mobile dependencies match the Expo SDK compatibility table', () => {
  const table = require('expo/bundledNativeModules.json');
  assert.equal(require('expo/package.json').version, manifest.dependencies.expo);
  for (const name of Object.keys(manifest.dependencies).filter((name) => name in table)) {
    assert.equal(require(`${name}/package.json`).version, table[name].replace(/^[~^]/, ''), name);
  }
});

test('public configuration preserves application identity, platforms and secure storage', () => {
  const result = run(['config', '--type', 'public', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.sdkVersion, '58.0.0');
  assert.equal(config.name, 'lukitas-mobile');
  assert.equal(config.slug, 'lukitas-mobile');
  assert.equal(config.scheme, 'lukitas');
  assert.deepEqual(config.platforms, ['ios', 'android', 'web']);
  assert.deepEqual(config.plugins, [
    'expo-router',
    'expo-secure-store',
    'expo-status-bar',
    'expo-sharing',
  ]);
});

test('a rejected configuration query leaves manifests and lockfile unchanged', () => {
  const paths = ['../app.json', '../package.json', '../../../pnpm-lock.yaml'];
  const hashes = () => paths.map((path) => createHash('sha256').update(read(path)).digest('hex'));
  const before = hashes();
  const result = run(['config', '--type', 'INVALID']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /AssertionError \[ERR_ASSERTION\]/);
  assert.match(result.stderr, /'INVALID'/);
  assert.deepEqual(hashes(), before);
});
