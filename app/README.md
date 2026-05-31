# app/

## Funcion principal

Contiene la aplicacion base del proyecto, sus pruebas, su configuracion de calidad y su empaquetado en Docker.

## Archivos

- `package.json`: define scripts (`build`, `test`, `lint`, `start`), dependencias y version de Node.
- `package-lock.json`: asegura instalaciones reproducibles de dependencias.
- `Dockerfile`: construye la imagen de la app para ejecucion en local/CI/AWS.
- `.dockerignore`: reduce el contexto de build de Docker.
- `.gitignore`: ignora artefactos locales de Node.
- `eslint.config.js`: reglas de analisis estatico (lint).

## Subcarpetas

- `src/`: codigo de la aplicacion HTTP.
- `test/`: pruebas unitarias/integracion ligera.

## Vinculos

- CI usa `npm ci`, `npm test`, `npm run lint` desde esta carpeta.
- `ci-docker.yml` construye imagen desde este `Dockerfile`.
- Terraform local y AWS consumen la imagen definida en `app_image`.
- Prometheus scrapea `GET /metrics` expuesto por esta app.
