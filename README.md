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
7. Exponga observabilidad lista para usar con Prometheus, Grafana, cAdvisor y node-exporter.

## Stack

- CI/CD: GitHub Actions
- IaC: Terraform
- Cloud: AWS (entorno productivo/entrega)
- Local: Docker provider de Terraform
- App: Node.js + Express
- Seguridad: ESLint + Snyk + SBOM CycloneDX
- Observabilidad: Prometheus + Grafana + cAdvisor + node-exporter + dashboard Grafana preconfigurado

## Estructura del proyecto

```text
pin/
├── .github/
│   └── workflows/
├── app/
│   ├── src/
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   │   └── app.test.js
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── package.json
│   └── README.md
├── monitoring/
│   ├── templates/
│   │   ├── docker-compose.yml.tftpl
│   │   └── prometheus.yml.tftpl
│   ├── docker-compose.yml
│   ├── dashboard.json
│   ├── alerts.yml
│   ├── prometheus.yml
│   ├── provisioning/
│   │   ├── dashboards/
│   │   └── datasources/
│   └── README.md
├── security/
│   ├── sbom/
│   ├── sonar/
│   ├── snyk/
│   └── README.md
├── terraform/
│   ├── aws/
│   │   ├── main.tf
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── user_data.sh.tftpl
│   │   ├── terraform.tfvars.example
│   │   └── README.md
│   ├── local/
│   │   ├── main.tf
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── terraform.tfvars.example
│   │   └── README.md
│   └── README.md
├── docs/
│   ├── architecture/
│   ├── screenshots/
│   ├── video/
│   ├── entregables.md
│   └── README.md
├── consigna.md
├── paso-a-paso-proyecto1.md
└── README.md
```

## Función de cada módulo

### 1) App (`app/`)

- Es una app Node.js + Express orientada a demo de observabilidad y caché.
- Expone endpoints:
  - `/`: responde `{ ok: true, delay }` y simula una pequeña latencia.
  - `/health`: healthcheck simple y valida si Redis está disponible.
  - `/weather`: consulta Open-Meteo, usa caché en Redis y registra métricas del upstream.
  - `/metrics`: expone métricas Prometheus de requests, caché, dependencias y tiempos.
  - `/project`: sirve una página HTML con la arquitectura y enlaces del proyecto.
  - `/project/services`: devuelve URLs de App, Grafana, Prometheus, cAdvisor y node-exporter.
  - `/static`: sirve assets públicos de la carpeta `app/public/`.
- Soporta ciudades conocidas o coordenadas `lat/lon` directas para `/weather`.
- Intenta leer `terraform output -json` para autocompletar URLs del entorno AWS.
- Incluye tests unitarios, lint y `Dockerfile` reproducible para publicar imagen.

### 2) Monitoring (`monitoring/`)

Plantillas reutilizadas por ambos entornos (local y AWS), con dashboard listo para importarse en Grafana:

- `templates/docker-compose.yml.tftpl`: define servicios `pin-app`, `prometheus`, `grafana`, `cadvisor`, `node-exporter`.
- `templates/prometheus.yml.tftpl`: targets de scraping de app y componentes de observabilidad.
- `dashboard.json`: dashboard principal de Grafana con paneles de app, contenedores e instancia.
- `provisioning/`: datasource y dashboards auto-provisionados para evitar configuración manual.

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

- `00-pipeline-orchestrator.yml` (orquestador):
  - Servicio: GitHub Actions (workflow principal).
  - Que hace: dispara en `push`/`pull_request` a `main`, hereda secrets a workflows reusables y define el orden de ejecución.
  - Permisos: `contents:read` para checkout y `packages:write` para publicar imagen en GHCR.
- `10-pipeline-build-test.yml` (build + tests):
  - Servicio: Runner `ubuntu-latest` + `actions/setup-node@v4`.
  - Que hace:
    - Job `build`: `actions/checkout`, instala Node 20, ejecuta `npm ci` y `npm run build` en `app/`.
    - Job `test`: vuelve a hacer checkout/setup, ejecuta `npm ci` y `npm test` en `app/`.
  - Resultado: valida que la app compile y que los tests unitarios pasen.
- `20-pipeline-security-sbom.yml` (ESLint + Snyk + SBOM):
  - Servicio: Runner `ubuntu-latest` + acciones de seguridad.
  - Que hace:
    - Job `security`: checkout, Node 20, `npm ci`, `npm run lint`, valida existencia de `SNYK_TOKEN`, y corre `snyk/actions/node@master` con `--severity-threshold=high --file=app/package.json`.
    - Job `sbom`: genera SBOM CycloneDX con `anchore/sbom-action@v0` sobre `./app` y lo publica como artifact `sbom-cyclonedx`.
  - Resultado: bloquea el pipeline si hay vulnerabilidades altas y deja evidencia SBOM para la entrega.
- `30-pipeline-docker-publish.yml` (build/push a GHCR, output `image_ref`):
  - Servicio: Runner `ubuntu-latest` + Docker Buildx + GHCR.
  - Que hace:
    - `actions/checkout`.
    - Genera tag corto con SHA y construye `image_ref` (`ghcr.io/<owner>/pin-app:<sha7>`).
    - `docker/login-action@v3` autentica en `ghcr.io` con `GITHUB_TOKEN`.
    - `docker/build-push-action@v6` construye `app/Dockerfile` y hace push de la imagen.
  - Resultado: publica imagen versionada y expone `image_ref` para el deploy.
- `40-pipeline-deploy-aws.yml` (terraform init/plan/apply en AWS):
  - Servicio: Runner `ubuntu-latest` + AWS Credentials Action + Terraform.
  - Que hace:
    - `actions/checkout`.
    - `aws-actions/configure-aws-credentials@v4` configura credenciales/region.
    - `hashicorp/setup-terraform@v3` instala Terraform.
    - Ejecuta `terraform init`, `terraform plan -input=false` y `terraform apply -input=false -auto-approve` en `terraform/aws`.
    - Inyecta variables sensibles con secrets (`TF_VAR_grafana_admin_password`, `TF_VAR_key_name`) y pasa `app_image` desde `image_ref`.
  - Resultado: crea/actualiza infraestructura AWS y despliega la versión de imagen publicada en GHCR.
- `41-pipeline-destroy-aws.yml` (terraform init/plan/apply en AWS):
  - Servicio: Runner `ubuntu-latest` + AWS Credentials Action + Terraform.
  - Que hace:
    - `actions/checkout`.
    - `aws-actions/configure-aws-credentials@v4` configura credenciales/region.
    - `hashicorp/setup-terraform@v3` instala Terraform.
    - Ejecuta `terraform destroy -input=false -auto-approve` en `terraform/aws`.
    - Inyecta variables sensibles con secrets (`TF_VAR_grafana_admin_password`, `TF_VAR_key_name`, `TF_VAR_project_name`, `TF_VAR_ghcr_username`, `TF_VAR_ghcr_token`).
  - Resultado: Elimina la infraestructura creada en AWS. Nota: No elimina el bucket s3 que almacena el estado de terraform.

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
- cAdvisor: `http://localhost:8081`
- node-exporter: `http://localhost:9100`

Dashboard sugerido en Grafana:

- `monitoring/dashboard.json`
- Métricas visibles: disponibilidad, tasa de requests, latencia, CPU y memoria de la instancia, CPU y memoria por contenedor, uptime de contenedores.

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
- `cadvisor_url`
- `node_exporter_url`

## Secrets requeridos en GitHub

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_KEY_NAME`
- `ADMIN_PASSWORD` (Grafana admin)
- `EC2_PROJECT_NAME`
- `TF_STATE_BUCKET` (S3 bucket para backend remoto de Terraform)
- `TF_STATE_KEY` (ruta/objeto del tfstate en S3, por ejemplo `pin/aws/terraform.tfstate`)
- `TF_LOCK_TABLE` (tabla DynamoDB para lock de estado)
- `GHCR_USERNAME` (opcional, requerido si la imagen en GHCR es privada)
- `GHCR_TOKEN` (opcional, requerido si la imagen en GHCR es privada)
- `SNYK_TOKEN`
- `GITHUB_TOKEN` (automatico, para login/push a GHCR)

## Evidencias para la entrega

Guardar en `docs/`:

- `pipeline-ok.png`
- `terraform-apply.png`
- `app-ok.png`
- `grafana-dashboard.png`
- `grafana-observability.png`
- `security-sbom.png`

## Troubleshooting rápido

- Si falla deploy AWS: revisar credenciales IAM y región.
- Si falla Snyk: validar `SNYK_TOKEN` en secrets.
- Si Grafana no abre: revisar puertos/security group y que el dashboard/provisioning se hayan montado correctamente.
- Si Terraform local falla: verificar Docker daemon activo.
