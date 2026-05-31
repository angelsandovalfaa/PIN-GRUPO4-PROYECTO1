# terraform/aws/

## Funcion principal

Provisionar infraestructura en AWS y levantar el stack de aplicacion/observabilidad en EC2.

## Archivos

- `providers.tf`: versiones requeridas y provider AWS.
- `variables.tf`: variables de entrada (red, puertos, credenciales, imagen app, etc.).
- `main.tf`: recursos AWS (VPC, subnet, IGW, route table, SG, EC2) y render de plantillas de `monitoring/`.
- `user_data.sh.tftpl`: bootstrap de EC2 (instala Docker/Compose y levanta stack).
- `outputs.tf`: URLs de salida (`app_url`, `prometheus_url`, `grafana_url`).
- `terraform.tfvars.example`: ejemplo de valores para crear `terraform.tfvars`.

## Vinculos

- Consume `../../monitoring/templates/docker-compose.yml.tftpl` y `../../monitoring/templates/prometheus.yml.tftpl`.
- Recibe `app_image` desde workflow `ci-docker.yml` (output `image_ref`) durante deploy.
- Es ejecutado por `.github/workflows/ci-deploy-aws.yml`.
