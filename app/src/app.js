const express = require('express');
const client = require('prom-client');
const { setTimeout } = require('node:timers/promises');
const path = require('path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const defaultCache = require('./cache');

const execFileAsync = promisify(execFile);

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

const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Aciertos de cache del proxy de clima',
  registers: [register]
});

const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Fallos de cache del proxy de clima',
  registers: [register]
});

const upstreamRequestsTotal = new client.Counter({
  name: 'upstream_requests_total',
  help: 'Requests salientes a Open-Meteo por status',
  labelNames: ['status_code'],
  registers: [register]
});

const upstreamRequestDuration = new client.Histogram({
  name: 'upstream_request_duration_seconds',
  help: 'Duracion de los requests a Open-Meteo',
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

const dependencyUp = new client.Gauge({
  name: 'dependency_up',
  help: 'Si una dependencia esta disponible (1) o no (0)',
  labelNames: ['dependency'],
  registers: [register]
});

const OPEN_METEO_URL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com';
const CACHE_TTL = Number(process.env.REDIS_TTL || 300);

// Ciudades soportadas por nombre (lat/lon fijos), para no sumar un segundo
// proxy de geocoding. Tambien se aceptan lat/lon directos.
const CITIES = {
  cordoba: { lat: -31.42, lon: -64.18 },
  'buenos-aires': { lat: -34.61, lon: -58.38 },
  mendoza: { lat: -32.89, lon: -68.84 },
  rosario: { lat: -32.95, lon: -60.66 },
  madrid: { lat: 40.42, lon: -3.7 },
  london: { lat: 51.51, lon: -0.13 }
};

// Resuelve lat/lon validados desde la query. Devuelve null si el input es
// invalido (nunca se usa input crudo para construir la URL del upstream).
function resolveCoords(query) {
  if (query.city !== undefined) {
    const key = String(query.city).toLowerCase();
    return CITIES[key] || null;
  }
  if (query.lat !== undefined && query.lon !== undefined) {
    const lat = Number(query.lat);
    const lon = Number(query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { lat, lon };
  }
  return null;
}

async function fetchWeather(lat, lon) {
  const url = `${OPEN_METEO_URL}/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m`;
  const end = upstreamRequestDuration.startTimer();
  const res = await fetch(url);
  end();
  upstreamRequestsTotal.inc({ status_code: String(res.status) });
  if (!res.ok) {
    const err = new Error(`upstream ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    temperature_c: data.current?.temperature_2m,
    wind_speed: data.current?.wind_speed_10m,
    time: data.current?.time
  };
}

function createApp({ cache = defaultCache } = {}) {
  const app = express();
  const publicDir = path.join(__dirname, '..', 'public');

  app.use('/static', express.static(publicDir));

  app.get('/weather', async (req, res) => {
    const coords = resolveCoords(req.query);
    if (!coords) {
      httpRequestsTotal.inc({ method: 'GET', route: '/weather', status_code: '400' });
      return res.status(400).json({
        error: 'Indica ?city=<conocida> o ?lat=&lon= validos',
        cities: Object.keys(CITIES)
      });
    }

    const key = `weather:${coords.lat},${coords.lon}`;
    const cached = await cache.getCache(key);
    if (cached) {
      cacheHitsTotal.inc();
      httpRequestsTotal.inc({ method: 'GET', route: '/weather', status_code: '200' });
      return res.status(200).json({ source: 'cache', ...cached });
    }
    cacheMissesTotal.inc();

    try {
      const weather = await fetchWeather(coords.lat, coords.lon);
      await cache.setCache(key, weather, CACHE_TTL);
      httpRequestsTotal.inc({ method: 'GET', route: '/weather', status_code: '200' });
      return res.status(200).json({ source: 'upstream', ...weather });
    } catch (err) {
      const status = err.status || 502;
      httpRequestsTotal.inc({ method: 'GET', route: '/weather', status_code: String(status) });
      return res.status(status).json({ error: 'No se pudo obtener el clima', detail: err.message });
    }
  });

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
    // Refresca la salud de redis en cada chequeo, asi dependency_up sigue
    // fresco en /metrics (Prometheus lo scrapea, no /health).
    dependencyUp.set({ dependency: 'redis' }, cache.isCacheUp() ? 1 : 0);
    httpRequestsTotal.inc({ method: 'GET', route: '/health', status_code: '200' });
    res.status(200).json({ status: 'healthy', cache: cache.isCacheUp() ? 'up' : 'down' });
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
