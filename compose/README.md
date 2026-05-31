# compose/

## Funcion principal

Define plantillas compartidas de ejecucion de contenedores y scraping de observabilidad para ambos entornos (`terraform/local` y `terraform/aws`).

## Archivos

- `docker-compose.yml.tftpl`: plantilla de servicios (app, prometheus, grafana, cadvisor, node-exporter).
- `prometheus.yml.tftpl`: plantilla de targets que Prometheus debe scrapear.

## Vinculos

- `terraform/aws/main.tf` renderiza estas plantillas y las inyecta en EC2 via `user_data`.
- `terraform/local/main.tf` reutiliza `prometheus.yml.tftpl` para configurar el contenedor Prometheus local.
- Esta carpeta evita duplicar definiciones de observabilidad entre local y nube.
