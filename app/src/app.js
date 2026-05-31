const express = require('express');
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

function createApp() {
  const app = express();

  app.get('/', (_req, res) => {
    httpRequestsTotal.inc({ method: 'GET', route: '/', status_code: '200' });
    res.status(200).json({
      service: 'pin-app',
      status: 'ok'
    });
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
