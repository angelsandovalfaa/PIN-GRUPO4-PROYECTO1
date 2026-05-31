# .github/workflows/

## Funcion principal

Pipeline modular de GitHub Actions.

## Archivos

- `00-pipeline-orchestrator.yml`: workflow orquestador; define triggers (`push` y `pull_request` a `main`) y encadena jobs reusables.
- `10-pipeline-build-test.yml`: workflow reusable con build y tests de la app.
- `20-pipeline-security-sbom.yml`: workflow reusable con ESLint, Snyk y generacion de SBOM.
- `30-pipeline-docker-publish.yml`: workflow reusable de build/push de imagen a GHCR y salida `image_ref`.
- `40-pipeline-deploy-aws.yml`: workflow reusable para `terraform init/plan/apply` en `terraform/aws`.

## Que corre en cada pipeline

1. `00-pipeline-orchestrator.yml`
- Corre en GitHub Actions como workflow principal.
- Dispara y ordena: build/test -> security/sbom -> docker -> deploy (solo `main`).

2. `10-pipeline-build-test.yml`
- Runner: `ubuntu-latest`.
- Servicios/procesos: Node.js 20, `npm ci`, `npm run build`, `npm test` en `app/`.

3. `20-pipeline-security-sbom.yml`
- Runner: `ubuntu-latest`.
- Servicios/procesos: `eslint`, `snyk/actions/node` (contenedor `snyk/snyk:node`) y `anchore/sbom-action` para SBOM CycloneDX.

4. `30-pipeline-docker-publish.yml`
- Runner: `ubuntu-latest`.
- Servicios/procesos: `docker/login-action` contra `ghcr.io` y `docker/build-push-action` (Buildx) para build + push de imagen.

5. `40-pipeline-deploy-aws.yml`
- Runner: `ubuntu-latest`.
- Servicios/procesos: `aws-actions/configure-aws-credentials`, `hashicorp/setup-terraform`, `terraform init/plan/apply` en `terraform/aws`.

## Flujo entre workflows

1. `00-pipeline-orchestrator.yml` llama `10-pipeline-build-test.yml`.
2. Si pasa, llama `20-pipeline-security-sbom.yml`.
3. Si pasa, llama `30-pipeline-docker-publish.yml`.
4. En rama `main`, usa `image_ref` y llama `40-pipeline-deploy-aws.yml`.

## Secrets requeridos

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_KEY_NAME`
- `ADMIN_PASSWORD`
- `SNYK_TOKEN`
- `GITHUB_TOKEN` (automatico para GHCR)
