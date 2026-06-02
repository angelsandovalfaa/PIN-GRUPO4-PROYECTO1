const { createApp } = require('./app');
const { connectCache } = require('./cache');

const port = Number(process.env.PORT || 3001);
const app = createApp();

// Conecta a redis si esta configurado; si falla, la app igual levanta (sin
// cache). No bloquea el listen.
connectCache();

app.listen(port, () => {
  console.log(`pin-app escuchando en puerto ${port}`);
});
