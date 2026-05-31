# Terraform PIN - AWS

Infraestructura base para el Proyecto 1 (PIN) en AWS:
- VPC y subnet pública
- Internet Gateway y routing
- Security Group (SSH + app + Prometheus + Grafana)
- Instancia EC2 (Amazon Linux 2023)
- Bootstrap por `user_data` para levantar Docker, app, Prometheus y Grafana

## Archivos
- `providers.tf`: provider AWS y versión de Terraform
- `variables.tf`: variables de entrada
- `main.tf`: recursos de red y EC2
- `user_data.sh.tftpl`: script de bootstrap (render + compose up)
- `../../compose/docker-compose.yml.tftpl`: stack modular de contenedores
- `../../compose/prometheus.yml.tftpl`: scraping de app + observabilidad
- `outputs.tf`: URLs y datos de salida
- `terraform.tfvars.example`: ejemplo de variables

## Uso
1. Copiar variables:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
2. Editar `terraform.tfvars` (mínimo: `key_name` y `grafana_admin_password`).
3. Ejecutar:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## Notas de seguridad
- Restringir `allowed_cidr` a tu IP pública (`x.x.x.x/32`) y evitar `0.0.0.0/0` en producción.
- Cambiar la password de Grafana por una fuerte.
- Para endurecimiento extra, mover secretos a AWS SSM Parameter Store.
