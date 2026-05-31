# monitoring/

## Funcion principal

Centraliza observabilidad y stack de monitoreo para local y AWS.

## Archivos

- `docker-compose.yml`: ejemplo runnable local de monitoreo + app.
- `prometheus.yml`: ejemplo runnable local de scraping.
- `templates/docker-compose.yml.tftpl`: plantilla usada por Terraform AWS.
- `templates/prometheus.yml.tftpl`: plantilla usada por Terraform AWS y local.

## Vinculos

- `terraform/aws/main.tf` y `terraform/local/main.tf` consumen `templates/*.tftpl`.
- `docs/screenshots/` guarda evidencias de Prometheus y Grafana.
