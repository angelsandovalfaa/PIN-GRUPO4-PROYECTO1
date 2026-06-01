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

## Endpoints

- `GET /`: estado base en JSON (`service`, `status`).
- `GET /health`: healthcheck simple.
- `GET /metrics`: metricas Prometheus.
- `GET /project`: pagina HTML que explica la arquitectura del proyecto y enlaces de servicios.
- `GET /project/services`: JSON con URLs de App, Grafana, Prometheus, cAdvisor y Node Exporter.

## Variables opcionales para `/project/services`

- `SERVICE_PROTOCOL` y `SERVICE_HOST`: base para construir URLs por defecto.
- `APP_URL`, `GRAFANA_URL`, `PROMETHEUS_URL`, `CADVISOR_URL`, `NODE_EXPORTER_URL`: override por servicio.

El endpoint intenta primero leer `terraform/aws` con `terraform output -json` para usar:
- `instance_public_ip`
- `app_url`
- `prometheus_url`
- `grafana_url`

Si no puede leer esos outputs (por ejemplo, sin backend inicializado), usa los defaults/env vars.
