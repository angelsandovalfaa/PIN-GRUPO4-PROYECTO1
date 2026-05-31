# app/test/

## Funcion principal

Pruebas automatizadas de endpoints y metricas.

## Archivos

- `app.test.js`: valida respuesta de `/`, `/health` y exposicion de metricas en `/metrics`.

## Vinculos

- Se ejecuta en CI en la etapa `build/test`.
- Su resultado decide si el pipeline continua a seguridad, docker y deploy.
