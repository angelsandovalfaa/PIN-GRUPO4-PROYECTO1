# monitoring/

## Funcion principal

Centraliza observabilidad y stack de monitoreo para local y AWS. Tambien es el
entorno para **desarrollar y probar** la app en local con todo el stack.

## Archivos

- `docker-compose.yml`: stack local completo (app, redis, prometheus, grafana,
  cadvisor, node-exporter). La app usa la imagen `pin-app:local` (pre-buildeada).
- `docker-compose.dev.yml`: overlay de desarrollo. Reemplaza el `pin-app` por uno
  con **hot-reload** (`node --watch`, codigo montado del host), heredando el resto
  del stack del compose base.
- `prometheus.yml`: scraping local (app, cadvisor, node-exporter, prometheus).
- `alerts.yml`: reglas de alerta de Prometheus.
- `dashboard.json` + `provisioning/`: dashboard de Grafana auto-provisionado.
- `templates/*.tftpl`: plantillas que consume Terraform (AWS y local).

## Levantar en local

Con [`just`](../justfile) desde la raiz del repo:

```bash
just dev        # entorno de dev: app con hot-reload + stack completo
just dev-down   # bajar

just up         # stack prod-like: buildea pin-app:local y levanta
just down
```

Sin `just`, los comandos equivalentes:

```bash
# dev (hot-reload)
docker compose -f monitoring/docker-compose.yml -f monitoring/docker-compose.dev.yml up

# prod-like (imagen buildeada)
docker build -t pin-app:local ./app
docker compose -f monitoring/docker-compose.yml up -d
```

URLs: app `:8080`, Prometheus `:9090`, Grafana `:3000` (dashboard provisionado,
acceso anonimo de solo-lectura), cAdvisor `:8081`, node-exporter `:9100`.

En dev, los cambios en `app/src/` reinician la app sola (no hay que rebuildear ni
reiniciar el contenedor). `node_modules` vive en un volumen anonimo, asi que el
mount del host no lo pisa.

## Vinculos

- `terraform/aws/main.tf` y `terraform/local/main.tf` consumen `templates/*.tftpl`.
- `docs/screenshots/` guarda evidencias de Prometheus y Grafana.
