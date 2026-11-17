import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveDevelopmentApiUrl } from '../src/api/development-api-url.ts';

test('local development follows the current Expo or browser host instead of a saved IP', () => {
  for (const host of ['192.168.0.5', '192.168.1.24']) {
    assert.equal(
      resolveDevelopmentApiUrl({ development: true, metroHost: `${host}:19006` }),
      `http://${host}:3000/v1`,
    );
    assert.equal(
      resolveDevelopmentApiUrl({
        development: true,
        browserHostname: host,
        metroHost: '192.0.2.10:19006',
      }),
      `http://${host}:3000/v1`,
    );
  }
  assert.equal(
    resolveDevelopmentApiUrl({ development: true, browserHostname: 'localhost' }),
    'http://localhost:3000/v1',
  );
  assert.equal(
    resolveDevelopmentApiUrl({
      development: true,
      configuredUrl: 'auto',
      metroHost: '192.168.0.5:19006',
    }),
    'http://192.168.0.5:3000/v1',
  );
});

test('explicit API URLs and non-development fallback keep their previous behavior', () => {
  for (const development of [true, false]) {
    assert.equal(
      resolveDevelopmentApiUrl({
        development,
        configuredUrl: 'https://api.example.test/v1',
        metroHost: '192.168.0.5:19006',
      }),
      'https://api.example.test/v1',
    );
  }
  assert.equal(
    resolveDevelopmentApiUrl({ development: false, metroHost: '192.168.0.5:19006' }),
    undefined,
  );
  assert.equal(resolveDevelopmentApiUrl({ development: true }), undefined);
});

test('a Metro tunnel is not mistaken for a tunnel to the API', () => {
  assert.throws(
    () =>
      resolveDevelopmentApiUrl({
        development: true,
        metroHost: 'project.exp.direct:19006',
      }),
    /EXPO_PUBLIC_API_URL/,
  );
});

test('browser wins over stale Metro host; explicit URL bypasses inference', () => {
  assert.equal(
    resolveDevelopmentApiUrl({
      development: true,
      configuredUrl: 'auto',
      browserHostname: '127.0.0.1',
      metroHost: '192.168.0.11:19006',
    }),
    'http://127.0.0.1:3000/v1',
  );
  assert.equal(
    resolveDevelopmentApiUrl({
      development: true,
      configuredUrl: 'https://api.example.test/custom/v2',
      metroHost: 'broken host',
    }),
    'https://api.example.test/custom/v2',
  );
});
