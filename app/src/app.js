const express = require('express');
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

function createApp() {
  const app = express();

  app.get('/', async (req, res) => {
    const end = httpRequestDuration.startTimer();
    const delay = req.query.delay ? parseInt(req.query.delay, 10) : Math.random() * 300;
    await new Promise((r) => setTimeout(r, delay));
    res.json({ ok: true, delay: Math.round(delay) });
    end({ method: req.method, route: '/', code: 200 });
    httpRequestsTotal.inc({ method: req.method, route: '/', status_code: '200' });
  });

  app.get('/health', (_req, res) => {
    httpRequestsTotal.inc({ method: 'GET', route: '/health', status_code: '200' });
    res.status(200).json({ status: 'healthy' });
  });

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  return app;
}

module.exports = { createApp };
