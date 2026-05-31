# PIN - Proyecto 1 (Grupo 4)

Proyecto integral de DevOps para la materia PIN: pipeline CI/CD con GitHub Actions, infraestructura como código con Terraform, app contenedorizada con Docker, controles de seguridad y observabilidad con Prometheus + Grafana.

## Objetivo

Construir un flujo completo que:

1. Compile y testee la app.
2. Ejecute controles de seguridad.
3. Genere SBOM.
4. Construya y publique imagen Docker.
5. Despliegue en AWS con Terraform.
6. Permita también pruebas locales con Terraform + Docker.

## Stack

- CI/CD: GitHub Actions
- IaC: Terraform
- Cloud: AWS (entorno productivo/entrega)
- Local: Docker provider de Terraform
- App: Node.js + Express
- Seguridad: ESLint + Snyk + SBOM CycloneDX
- Observabilidad: Prometheus + Grafana + cAdvisor + node-exporter

## Estructura del repositorio

- `app/`: aplicación Node.js
- `monitoring/`: configuracion y plantillas de observabilidad
- `security/`: evidencias y artefactos de seguridad
- `terraform/local/`: infraestructura local para pruebas
- `terraform/aws/`: infraestructura en AWS para entrega
- `terraform/README.md`: guía general de ambientes Terraform
- `.github/workflows/`: pipeline modular
- `docs/`: evidencias (capturas/reportes)

## Función de cada módulo

### 1) App (`app/`)

- Expone endpoints:
  - `/` estado de servicio
  - `/health` healthcheck
  - `/metrics` métricas Prometheus
- Incluye tests unitarios y lint.
- Tiene `Dockerfile` reproducible para publicar imagen.

### 2) Monitoring (`monitoring/`)

Plantillas reutilizadas por ambos entornos (local y AWS):

- `templates/docker-compose.yml.tftpl`: define servicios `pin-app`, `prometheus`, `grafana`, `cadvisor`, `node-exporter`.
- `templates/prometheus.yml.tftpl`: targets de scraping de app y componentes de observabilidad.

### 3) Security (`security/`)

- Carpeta de soporte para guardar SBOM y evidencias de escaneo (Snyk/Sonar).
- Facilita demostrar el criterio de seguridad de la rubrica.

### 4) Terraform Local (`terraform/local/`)

- Levanta el stack completo en tu máquina usando provider Docker.
- Sirve para validar rápido la solución sin consumir AWS.
- Ideal para pruebas funcionales y demo previa.

### 5) Terraform AWS (`terraform/aws/`)

- Crea infraestructura en nube:
  - VPC
  - Subnet pública
  - Internet Gateway + route table
  - Security Group
  - EC2
- `user_data` instala Docker/Compose y levanta el stack usando plantillas de `monitoring/`.
- Recibe `app_image` para desplegar la imagen versionada desde CI.

### 6) Workflows GitHub (`.github/workflows/`)

Pipeline modular por responsabilidad:

- `00-pipeline-orchestrator.yml` (orquestador)
- `10-pipeline-build-test.yml` (build + tests)
- `20-pipeline-security-sbom.yml` (ESLint + Snyk + SBOM)
- `30-pipeline-docker-publish.yml` (build/push a GHCR, output `image_ref`)
- `40-pipeline-deploy-aws.yml` (terraform init/plan/apply en AWS)

Flujo: `build/test` -> `security/sbom` -> `docker` -> `deploy` (solo en `main`).

## Ejecución local de app

```bash
cd app
npm ci
npm run lint
npm test
npm run build
npm start
```

## Ejecución local con Docker

```bash
docker build -t pin-app:local ./app
docker run -p 8080:80 pin-app:local
```

## Terraform Local (pruebas)

```bash
cd terraform/local
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform plan
terraform apply
```

Salidas esperadas:

- App: `http://localhost:8080`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

Destruir entorno local:

```bash
terraform destroy
```

## Terraform AWS (nube)

```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
# editar al menos: key_name y grafana_admin_password
terraform fmt -recursive
terraform init
terraform validate
terraform plan
terraform apply
```

Outputs esperados:

- `app_url`
- `prometheus_url`
- `grafana_url`

## Secrets requeridos en GitHub

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SNYK_TOKEN`

Nota: GHCR usa `GITHUB_TOKEN` del workflow.

## Evidencias para la entrega

Guardar en `docs/`:

- `pipeline-ok.png`
- `terraform-apply.png`
- `app-ok.png`
- `grafana-dashboard.png`
- `security-sbom.png`

## Troubleshooting rápido

- Si falla deploy AWS: revisar credenciales IAM y región.
- Si falla Snyk: validar `SNYK_TOKEN` en secrets.
- Si Grafana no abre: revisar puertos/security group.
- Si Terraform local falla: verificar Docker daemon activo.
