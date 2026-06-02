const { test } = require('node:test');
const assert = require('node:assert');
const cache = require('../src/cache');

// Sin REDIS_URL la app corre sin cache (degradacion elegante). Estos tests
// ejercitan ese camino sin necesitar un Redis real: el cache queda "caido" y
// las operaciones bypasean en vez de fallar.

test('connectCache sin REDIS_URL no conecta', async () => {
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  delete process.env.REDIS_PORT;
  await cache.connectCache();
  assert.strictEqual(cache.isCacheUp(), false);
});

test('getCache con cache caido devuelve null (bypass)', async () => {
  assert.strictEqual(await cache.getCache('weather:0,0'), null);
});

test('setCache con cache caido es no-op y no lanza', async () => {
  await assert.doesNotReject(() => cache.setCache('weather:0,0', { temperature_c: 1 }, 60));
});

test('disconnectCache sin cliente es no-op y no lanza', async () => {
  await assert.doesNotReject(() => cache.disconnectCache());
});
