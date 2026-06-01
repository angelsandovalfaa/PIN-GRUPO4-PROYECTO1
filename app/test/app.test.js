const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('GET / responde estado ok', async () => {
  const app = createApp();
  const res = await request(app).get('/');

  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'pin-app');
  assert.equal(res.body.status, 'ok');
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
