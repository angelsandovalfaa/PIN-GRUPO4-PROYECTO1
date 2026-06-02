# .github/workflows/

## Funcion principal

Pipeline modular de GitHub Actions. Un orquestador encadena workflows reusables
para build, test, seguridad, publicacion de imagen y deploy; ademas hay
workflows manuales para operar la infra (bootstrap, rollback, destroy) y
workflows standalone de validacion de Terraform y analisis de SonarQube.

Convencion: las actions de terceros estan **pineadas a SHA** (no a tags
flotantes), Node es **24 (LTS)**, y los jobs tienen `timeout-minutes`.

## Archivos

### Pipeline orquestado (push / pull_request a `main`)

- `00-pipeline-orchestrator.yml`: orquestador. Dispara en `push`/`pull_request`
  a `main`, hereda secrets a los reusables (`secrets: inherit`) y define el orden.
  Permisos minimos: `contents: read`, `packages: write`.
- `10-pipeline-build-test.yml` (reusable): job `build` (`npm ci` + `npm run build`)
  y job `test` (`npm run test:coverage`, tests con cobertura) en `app/`, Node 24
  con cache de npm.
- `20-pipeline-security-sbom.yml` (reusable): job `security` (ESLint + Snyk sobre
  `app/package.json`, umbral high) y job `sbom` (build local de la imagen, **Trivy**
  para vulnerabilidades de la imagen en modo reporte, y **SBOM CycloneDX de la
  imagen** publicado como artifact).
- `30-pipeline-docker-publish.yml` (reusable): construye `app/Dockerfile`, taggea
  `ghcr.io/<owner>/pin-app:<short-sha>` y la publica en GHCR para el deploy.
  Expone `image_ref` como output.
- `40-pipeline-deploy-aws.yml` (reusable): `terraform init/plan/apply` en
  `terraform/aws` con backend remoto S3 + lock DynamoDB. Recibe `image_ref` y lo
  pasa como `app_image`. Concurrency en group estatico `terraform-aws`.

### Filtro de deploy

El orquestador tiene un job `changes` que, en push a `main`, usa `git diff` para
detectar si el push toco `terraform/aws/`, `monitoring/` o `app/` (lo unico que
afecta lo deployado). El `ci_deploy_aws` solo corre si hubo ese tipo de cambio:
un merge de solo docs, CI o `terraform/local` ya **no** dispara deploy (la cadena
build/test/sbom/docker igual corre siempre).

### Workflows manuales de infra (`workflow_dispatch`)

- `42-pipeline-bootstrap-aws.yml`: crea el backend remoto (bucket S3 + tabla
  DynamoDB) corriendo el modulo `terraform/bootstrap`. Confirmacion `BOOTSTRAP`.
  Idempotente: importa el bucket/tabla si ya existen. Se corre una sola vez.
- `50-pipeline-rollback-aws.yml`: redeploya un tag/short-SHA previo de GHCR sin
  rebuild, reusando el deploy `40`. Confirmacion `ROLLBACK`. Valida el tag antes
  de usarlo.
- `41-pipeline-destroy-aws.yml`: `terraform destroy` de `terraform/aws`.
  Confirmacion `DESTROY` y gate de aprobacion via environment `production-destroy`
  (requiere configurar required reviewers en Settings para que frene). No borra el
  bucket del state.

### Workflows standalone (push / pull_request a `main`)

- `terraform-validate.yml`: `terraform fmt -check`, `validate` por modulo y
  **Trivy config** (misconfiguraciones de IaC, reemplaza al deprecado tfsec) en
  modo reporte. Da feedback temprano sobre los `.tf` antes del deploy.
- `sonarqube.yml`: analisis de SonarQube Cloud CI-based **con cobertura** (genera
  lcov con `node --test` y lo sube con `sonarqube-scan-action`). Es un check de
  calidad, no gatea el resto del pipeline.

## Flujo del pipeline orquestado

1. `00` llama `10` (build + test).
2. Si pasa, `20` (security + sbom).
3. Si pasa, `30` (docker publish).
4. En push a `main` y si `changes` detecto cambios de infra/app, `40` (deploy).

`terraform-validate` y `sonarqube` corren en paralelo, por su cuenta.

## Secrets requeridos

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `AWS_KEY_NAME`
- `ADMIN_PASSWORD` (admin de Grafana)
- `EC2_PROJECT_NAME`
- `TF_STATE_BUCKET`, `TF_STATE_KEY`, `TF_LOCK_TABLE` (backend remoto)
- `GHCR_USERNAME`, `GHCR_TOKEN` (opcionales, si la imagen en GHCR es privada)
- `SNYK_TOKEN`
- `SONAR_TOKEN`
- `GITHUB_TOKEN` (automatico, para GHCR)
