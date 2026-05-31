# .github/workflows/

## Funcion principal

Pipeline modular de GitHub Actions.

## Archivos

- `ci-cd.yml`: workflow orquestador; define triggers (`push` y `pull_request` a `main`) y encadena jobs reusables.
- `ci-build-test.yml`: workflow reusable con build y tests de la app.
- `ci-security-sbom.yml`: workflow reusable con ESLint, Snyk y generacion de SBOM.
- `ci-docker.yml`: workflow reusable de build/push de imagen a GHCR y salida `image_ref`.
- `ci-deploy-aws.yml`: workflow reusable para `terraform init/plan/apply` en `terraform/aws`.

## Flujo entre workflows

1. `ci-cd.yml` llama `ci-build-test.yml`.
2. Si pasa, llama `ci-security-sbom.yml`.
3. Si pasa, llama `ci-docker.yml`.
4. En rama `main`, usa `image_ref` y llama `ci-deploy-aws.yml`.

## Secrets requeridos

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SNYK_TOKEN`
- `GITHUB_TOKEN` (automatico para GHCR)
