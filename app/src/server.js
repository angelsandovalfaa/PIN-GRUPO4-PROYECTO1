const { createApp } = require('./app');

const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`pin-app escuchando en puerto ${port}`);
});
