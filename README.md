# PIN - Proyecto 1 (Grupo 4)

Pipeline CI/CD con GitHub Actions para construir, testear, analizar seguridad y desplegar una app Docker en AWS usando Terraform. Incluye observabilidad con Prometheus y Grafana.

## Stack

- CI/CD: GitHub Actions
- IaC: Terraform + AWS
- App: Node.js + Express
- Contenedores: Docker
- Seguridad: ESLint + Snyk + SBOM CycloneDX
- Observabilidad: Prometheus + Grafana

## Estructura del repositorio

- `app/`: aplicacion, tests, Dockerfile
- `terraform/local`: infraestructura local para pruebas (Docker provider)
- `terraform/aws`: infraestructura AWS para nube
- `compose/`: plantillas modulares de Docker Compose y Prometheus
- `.github/workflows/`: pipeline CI/CD
- `docs/`: evidencias (capturas/reportes)

## App local

Requisitos:

- Node.js 20+
- npm
- Docker

Pasos:

```bash
cd app
npm ci
npm run lint
npm test
npm run build
```

## Docker local

```bash
docker build -t pin-app:local ./app
docker run -p 8080:80 pin-app:local
```

Endpoints:

- App: `http://localhost:8080/`
- Health: `http://localhost:8080/health`
- Metrics: `http://localhost:8080/metrics`

## Terraform (AWS)

Requisitos:

- Terraform 1.5+
- Credenciales AWS configuradas
- Key pair existente en AWS

Pasos:

```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
# editar key_name y grafana_admin_password
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

## Terraform (Local)

Para pruebas sin AWS:

```bash
cd terraform/local
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform plan
terraform apply
```

## Pipeline CI/CD

Orquestador: `.github/workflows/ci-cd.yml`

Workflows modulares:

- `.github/workflows/ci-build-test.yml`
- `.github/workflows/ci-security-sbom.yml`
- `.github/workflows/ci-docker.yml`
- `.github/workflows/ci-deploy-aws.yml`

Etapas:

1. `build`: instala dependencias y compila
2. `test`: ejecuta unit tests
3. `security`: ESLint + Snyk (falla con severidad alta/critica)
4. `sbom`: genera CycloneDX y lo publica como artifact
5. `docker`: build y push a GHCR con tag SHA corto
6. `deploy` (solo `main`): `terraform init/plan/apply` con `app_image` versionada

## Secrets requeridos en GitHub

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SNYK_TOKEN`

Nota: para publicar en GHCR se usa `GITHUB_TOKEN` del workflow.

## Observabilidad

`user_data` de EC2 renderiza plantillas y levanta stack con Docker Compose:

- contenedor de app
- contenedor Prometheus (scrapea `pin-app:80/metrics`)
- contenedor Grafana
- contenedor cAdvisor (metricas de contenedores)
- contenedor node-exporter (metricas de host)

Credenciales Grafana desde variables Terraform:

- `grafana_admin_user`
- `grafana_admin_password`

## Evidencias para entrega

Guardar en `docs/`:

- pipeline en verde (`docs/pipeline-ok.png`)
- terraform apply exitoso (`docs/terraform-apply.png`)
- app funcionando (`docs/app-ok.png`)
- dashboard grafana (`docs/grafana-dashboard.png`)
- reporte seguridad/sbom (`docs/security-sbom.png`)

## Troubleshooting

- Si falla Terraform por permisos, revisar IAM del usuario AWS.
- Si falla Snyk, validar `SNYK_TOKEN` en Secrets.
- Si deploy no corre, verificar que el push sea a `main`.
- Si Grafana no abre, revisar security group y puertos expuestos.
