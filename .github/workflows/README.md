# .github/workflows/

## Funcion principal

Pipeline modular de GitHub Actions.

## Archivos

- `pipeline-orchestrator.yml`: workflow orquestador; define triggers (`push` y `pull_request` a `main`) y encadena jobs reusables.
- `pipeline-build-test.yml`: workflow reusable con build y tests de la app.
- `pipeline-security-sbom.yml`: workflow reusable con ESLint, Snyk y generacion de SBOM.
- `pipeline-docker-publish.yml`: workflow reusable de build/push de imagen a GHCR y salida `image_ref`.
- `pipeline-deploy-aws.yml`: workflow reusable para `terraform init/plan/apply` en `terraform/aws`.

## Flujo entre workflows

1. `pipeline-orchestrator.yml` llama `pipeline-build-test.yml`.
2. Si pasa, llama `pipeline-security-sbom.yml`.
3. Si pasa, llama `pipeline-docker-publish.yml`.
4. En rama `main`, usa `image_ref` y llama `pipeline-deploy-aws.yml`.

## Secrets requeridos

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SNYK_TOKEN`
- `GITHUB_TOKEN` (automatico para GHCR)
