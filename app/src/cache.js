const { createClient } = require('redis');

// Cliente Redis opcional. Si REDIS_URL no esta definido o la conexion falla,
// la app sigue funcionando sin cache (degradacion elegante): getCache devuelve
// null y la request va directo al upstream.

let client = null;
let connected = false;

function redisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  if (!host) return null;
  const port = process.env.REDIS_PORT || '6379';
  return `redis://${host}:${port}`;
}

async function connectCache() {
  const url = redisUrl();
  if (!url) {
    console.log('REDIS_URL no definido: la app corre sin cache.');
    return;
  }
  try {
    client = createClient({ url });
    client.on('error', (err) => {
      connected = false;
      console.error('redis error:', err.message);
    });
    client.on('ready', () => {
      connected = true;
    });
    await client.connect();
    connected = true;
    console.log('redis conectado.');
  } catch (err) {
    connected = false;
    client = null;
    console.error('no se pudo conectar a redis, la app corre sin cache:', err.message);
  }
}

function isCacheUp() {
  return connected && client !== null;
}

async function getCache(key) {
  if (!isCacheUp()) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('redis get fallo, bypass:', err.message);
    return null;
  }
}

async function setCache(key, value, ttlSeconds) {
  if (!isCacheUp()) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error('redis set fallo:', err.message);
  }
}

async function disconnectCache() {
  if (client) {
    try {
      await client.quit();
    } catch {
      // ignore
    }
    client = null;
    connected = false;
  }
}

module.exports = { connectCache, disconnectCache, getCache, setCache, isCacheUp };
