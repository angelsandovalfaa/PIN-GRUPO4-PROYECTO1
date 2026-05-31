# terraform/local/

## Funcion principal

Levantar localmente el stack completo con Terraform + Docker provider para pruebas y validacion.

## Archivos

- `providers.tf`: versiones requeridas y provider Docker.
- `variables.tf`: parametros de puertos, credenciales de Grafana e imagen app.
- `main.tf`: crea red, volumenes y contenedores (app, prometheus, grafana, cadvisor, node-exporter).
- `outputs.tf`: URLs locales de acceso.
- `terraform.tfvars.example`: valores ejemplo para entorno local.

## Vinculos

- Reutiliza `../../compose/prometheus.yml.tftpl` para configurar scraping.
- Permite validar observabilidad y funcionalidad antes de desplegar en `terraform/aws`.
