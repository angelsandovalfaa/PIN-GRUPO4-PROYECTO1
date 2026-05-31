# app/src/

## Funcion principal

Codigo runtime de la aplicacion.

## Archivos

- `app.js`: define rutas (`/`, `/health`, `/metrics`) e instrumentacion Prometheus.
- `server.js`: punto de entrada; crea el servidor y lo expone en el puerto configurado.

## Vinculos

- `server.js` es usado por `npm start` y por el `Dockerfile`.
- `app.js` es importado tambien en tests para validar comportamiento HTTP.
