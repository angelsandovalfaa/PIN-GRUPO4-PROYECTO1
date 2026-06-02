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
- App: Node.js + Express (Node 24 LTS)
- Seguridad: ESLint + Snyk + Trivy (imagen e IaC) + SonarQube Cloud + SBOM CycloneDX
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
│   ├── bootstrap/
│   │   ├── main.tf
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── README.md
├── docs/
│   ├── architecture/
│   ├── decisions/
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
- `dashboard.json`: dashboard principal de Grafana con paneles de app (estado, requests, error rate, latencia avg/p95, cache hit ratio, upstream Open-Meteo) y de host (node-exporter: CPU, memoria, load). cAdvisor se scrapea pero no tiene panel propio.
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

Pipeline modular: un orquestador (`00`) encadena reusables de build/test (`10`),
seguridad y SBOM (`20`: ESLint, Snyk, Trivy de imagen, SBOM CycloneDX), publicacion
de imagen a GHCR (`30`) y deploy a AWS (`40`). El deploy corre en push a `main` y
solo si un job `changes` detecta cambios en `terraform/aws/`, `monitoring/` o
`app/` (los merges de solo docs/CI no redeployan).

Hay ademas workflows manuales para operar la infra (`42` bootstrap del backend,
`50` rollback de imagen previa, `41` destroy con gate de aprobacion) y workflows
standalone de validacion de Terraform (`terraform-validate.yml`) y analisis de
SonarQube con cobertura (`sonarqube.yml`).

Detalle completo de cada workflow, el flujo y los secrets en
[`.github/workflows/README.md`](.github/workflows/README.md).

Flujo orquestado: `build/test` -> `security/sbom` -> `docker` -> `deploy` (en
`main`, si hubo cambios de infra/app).

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
docker run -p 8080:3000 pin-app:local
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
- Métricas visibles: disponibilidad, tasa de requests, error rate, latencia (avg y p95), cache hit ratio, upstream Open-Meteo, y CPU/memoria/load de la instancia (host, node-exporter).

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
- `SONAR_TOKEN` (analisis de SonarQube Cloud CI-based)
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
