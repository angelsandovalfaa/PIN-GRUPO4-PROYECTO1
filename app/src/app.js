const express = require('express');
const client = require('prom-client');
const { setTimeout } = require('node:timers/promises');

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
  const publicDir = path.join(__dirname, '..', 'public');

  app.use('/static', express.static(publicDir));

  app.get('/project', (_req, res) => {
    httpRequestsTotal.inc({ method: 'GET', route: '/project', status_code: '200' });
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('/project/services', async (req, res) => {
    const host = process.env.SERVICE_HOST || req.hostname;
    const protocol = process.env.SERVICE_PROTOCOL || req.protocol || 'http';
    const defaults = {
      appUrl: process.env.APP_URL || `${protocol}://${host}:8080`,
      grafanaUrl: process.env.GRAFANA_URL || `${protocol}://${host}:3000`,
      prometheusUrl: process.env.PROMETHEUS_URL || `${protocol}://${host}:9090`,
      cadvisorUrl: process.env.CADVISOR_URL || `${protocol}://${host}:8081`,
      nodeExporterUrl: process.env.NODE_EXPORTER_URL || `${protocol}://${host}:9100`
    };
    const terraformValues = await getTerraformServiceUrls();
    const appUrl = terraformValues.appUrl || defaults.appUrl;
    const grafanaUrl = terraformValues.grafanaUrl || defaults.grafanaUrl;
    const prometheusUrl = terraformValues.prometheusUrl || defaults.prometheusUrl;
    const cadvisorUrl = terraformValues.cadvisorUrl || defaults.cadvisorUrl;
    const nodeExporterUrl = terraformValues.nodeExporterUrl || defaults.nodeExporterUrl;

    httpRequestsTotal.inc({ method: 'GET', route: '/project/services', status_code: '200' });
    res.status(200).json({
      project: 'pin',
      generated_at: new Date().toISOString(),
      services: [
        { name: 'Pin App', url: appUrl, health_path: '/health' },
        { name: 'Grafana', url: grafanaUrl, health_path: '/api/health' },
        { name: 'Prometheus', url: prometheusUrl, health_path: '/-/ready' },
        { name: 'cAdvisor', url: cadvisorUrl, health_path: '/healthz' },
        { name: 'Node Exporter', url: nodeExporterUrl, health_path: '/metrics' }
      ]
    });
  });

  app.get('/', async (req, res) => {
    const end = httpRequestDuration.startTimer();
    const delay = req.query.delay ? parseInt(req.query.delay, 10) : Math.random() * 300;
    await setTimeout(delay);
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

async function getTerraformServiceUrls() {
  try {
    const terraformDir = path.join(__dirname, '..', '..', 'terraform', 'aws');
    const { stdout } = await execFileAsync('terraform', ['output', '-json'], { cwd: terraformDir });
    const data = JSON.parse(stdout);
    const instanceIp = data.instance_public_ip?.value;
    const appUrl = data.app_url?.value;
    const grafanaUrl = data.grafana_url?.value;
    const prometheusUrl = data.prometheus_url?.value;

    if (!instanceIp) {
      return { appUrl, grafanaUrl, prometheusUrl };
    }

    return {
      appUrl,
      grafanaUrl,
      prometheusUrl,
      cadvisorUrl: `http://${instanceIp}:8081`,
      nodeExporterUrl: `http://${instanceIp}:9100`
    };
  } catch {
    return {};
  }
}

module.exports = { createApp };
