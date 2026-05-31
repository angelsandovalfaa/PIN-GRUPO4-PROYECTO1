# .github/workflows/

## Funcion principal

Pipeline modular de GitHub Actions.

## Archivos

- `00-pipeline-orchestrator.yml`: workflow orquestador; define triggers (`push` y `pull_request` a `main`) y encadena jobs reusables.
- `10-pipeline-build-test.yml`: workflow reusable con build y tests de la app.
- `20-pipeline-security-sbom.yml`: workflow reusable con ESLint, Snyk y generacion de SBOM.
- `30-pipeline-docker-publish.yml`: workflow reusable de build/push de imagen a GHCR y salida `image_ref`.
- `40-pipeline-deploy-aws.yml`: workflow reusable para `terraform init/plan/apply` en `terraform/aws`.

## Flujo entre workflows

1. `00-pipeline-orchestrator.yml` llama `10-pipeline-build-test.yml`.
2. Si pasa, llama `20-pipeline-security-sbom.yml`.
3. Si pasa, llama `30-pipeline-docker-publish.yml`.
4. En rama `main`, usa `image_ref` y llama `40-pipeline-deploy-aws.yml`.

## Secrets requeridos

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SNYK_TOKEN`
- `GITHUB_TOKEN` (automatico para GHCR)
