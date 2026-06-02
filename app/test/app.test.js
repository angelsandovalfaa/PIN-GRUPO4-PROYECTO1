const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('GET / responde ok con delay', async () => {
  const app = createApp();
  const res = await request(app).get('/').query({ delay: 10 });

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.delay, 10);
});

test('GET /health responde healthy', async () => {
  const app = createApp();
  const res = await request(app).get('/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
});

test('GET /metrics expone http_requests_total', async () => {
  const app = createApp();
  await request(app).get('/');

  const res = await request(app).get('/metrics');
  assert.equal(res.status, 200);
  assert.match(res.text, /http_requests_total/);
  assert.match(res.text, /http_request_duration_seconds/);
});

test('GET /project entrega html', async () => {
  const app = createApp();
  const res = await request(app).get('/project');

  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('GET /project/services entrega urls de servicios', async () => {
  const app = createApp();
  const res = await request(app).get('/project/services');

  assert.equal(res.status, 200);
  assert.equal(res.body.project, 'pin');
  assert.ok(Array.isArray(res.body.services));
  assert.equal(res.body.services.length, 5);
});

// --- /weather (proxy + cache) ---

// Cache fake en memoria inyectable: simula el modulo cache.js sin Redis real.
function fakeCache({ up = true } = {}) {
  const store = new Map();
  return {
    up,
    getCalls: 0,
    setCalls: 0,
    isCacheUp() {
      return this.up;
    },
    async getCache(key) {
      this.getCalls += 1;
      if (!this.up) return null;
      return store.has(key) ? store.get(key) : null;
    },
    async setCache(key, value) {
      this.setCalls += 1;
      if (this.up) store.set(key, value);
    }
  };
}

// Stub de fetch global que devuelve una respuesta de Open-Meteo.
function stubFetch(payload, { status = 200 } = {}) {
  const calls = { count: 0, urls: [] };
  const original = global.fetch;
  global.fetch = async (url) => {
    calls.count += 1;
    calls.urls.push(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        return payload;
      }
    };
  };
  return {
    calls,
    restore() {
      global.fetch = original;
    }
  };
}

const SAMPLE = {
  latitude: -31.42,
  longitude: -64.18,
  current: { temperature_2m: 21.3, wind_speed_10m: 9.1, time: '2026-06-02T12:00' }
};

test('GET /weather miss llama al upstream y devuelve datos', async () => {
  const cache = fakeCache();
  const f = stubFetch(SAMPLE);
  try {
    const app = createApp({ cache });
    const res = await request(app).get('/weather').query({ city: 'cordoba' });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'upstream');
    assert.equal(res.body.temperature_c, 21.3);
    assert.equal(f.calls.count, 1);
    assert.equal(cache.setCalls, 1);
  } finally {
    f.restore();
  }
});

test('GET /weather hit no toca el upstream', async () => {
  const cache = fakeCache();
  const f = stubFetch(SAMPLE);
  try {
    const app = createApp({ cache });
    await request(app).get('/weather').query({ city: 'cordoba' }); // miss -> cachea
    const res = await request(app).get('/weather').query({ city: 'cordoba' }); // hit

    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'cache');
    assert.equal(f.calls.count, 1, 'el upstream se llama una sola vez');
  } finally {
    f.restore();
  }
});

test('GET /weather sin redis degrada a proxy directo', async () => {
  const cache = fakeCache({ up: false });
  const f = stubFetch(SAMPLE);
  try {
    const app = createApp({ cache });
    const res = await request(app).get('/weather').query({ city: 'cordoba' });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'upstream');
    assert.equal(f.calls.count, 1);
  } finally {
    f.restore();
  }
});

test('GET /weather con city desconocida responde 400', async () => {
  const app = createApp({ cache: fakeCache() });
  const res = await request(app).get('/weather').query({ city: 'atlantis' });

  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.cities));
});

test('GET /weather con lat/lon fuera de rango responde 400', async () => {
  const app = createApp({ cache: fakeCache() });
  const res = await request(app).get('/weather').query({ lat: '999', lon: '0' });

  assert.equal(res.status, 400);
});

test('GET /weather propaga error del upstream', async () => {
  const cache = fakeCache();
  const f = stubFetch({}, { status: 503 });
  try {
    const app = createApp({ cache });
    const res = await request(app).get('/weather').query({ city: 'madrid' });

    assert.equal(res.status, 503);
    assert.equal(cache.setCalls, 0, 'no cachea una respuesta de error');
  } finally {
    f.restore();
  }
});

test('GET /metrics expone metricas de cache y upstream', async () => {
  const cache = fakeCache();
  const f = stubFetch(SAMPLE);
  try {
    const app = createApp({ cache });
    await request(app).get('/weather').query({ city: 'london' }); // miss
    await request(app).get('/weather').query({ city: 'london' }); // hit

    const res = await request(app).get('/metrics');
    assert.match(res.text, /cache_hits_total/);
    assert.match(res.text, /cache_misses_total/);
    assert.match(res.text, /upstream_requests_total/);
  } finally {
    f.restore();
  }
});
