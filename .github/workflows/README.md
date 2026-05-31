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
- Servicio: GitHub Actions (workflow principal).
- Que hace: dispara en `push`/`pull_request` a `main`, hereda secrets a workflows reusables y define el orden de ejecucion.
- Permisos: `contents:read` para checkout y `packages:write` para publicar imagen en GHCR.

2. `10-pipeline-build-test.yml`
- Servicio: Runner `ubuntu-latest` + `actions/setup-node@v4`.
- Que hace:
- Job `build`: `actions/checkout`, instala Node 20, ejecuta `npm ci` y `npm run build` en `app/`.
- Job `test`: vuelve a hacer checkout/setup, ejecuta `npm ci` y `npm test` en `app/`.
- Resultado: valida que la app compile y que los tests unitarios pasen.

3. `20-pipeline-security-sbom.yml`
- Servicio: Runner `ubuntu-latest` + acciones de seguridad.
- Que hace:
- Job `security`: checkout, Node 20, `npm ci`, `npm run lint`, valida existencia de `SNYK_TOKEN`, y corre `snyk/actions/node@master` con `--severity-threshold=high --file=app/package.json`.
- Job `sbom`: genera SBOM CycloneDX con `anchore/sbom-action@v0` sobre `./app` y lo publica como artifact `sbom-cyclonedx`.
- Resultado: bloquea el pipeline si hay vulnerabilidades altas y deja evidencia SBOM para la entrega.

4. `30-pipeline-docker-publish.yml`
- Servicio: Runner `ubuntu-latest` + Docker Buildx + GHCR.
- Que hace:
- `actions/checkout`.
- Genera tag corto con SHA y construye `image_ref` (`ghcr.io/<owner>/pin-app:<sha7>`).
- `docker/login-action@v3` autentica en `ghcr.io` con `GITHUB_TOKEN`.
- `docker/build-push-action@v6` construye `app/Dockerfile` y hace push de la imagen.
- Resultado: publica imagen versionada y expone `image_ref` para el deploy.

5. `40-pipeline-deploy-aws.yml`
- Servicio: Runner `ubuntu-latest` + AWS Credentials Action + Terraform.
- Que hace:
- `actions/checkout`.
- `aws-actions/configure-aws-credentials@v4` configura credenciales/region.
- `hashicorp/setup-terraform@v3` instala Terraform.
- Ejecuta `terraform init`, `terraform plan -input=false` y `terraform apply -input=false -auto-approve` en `terraform/aws`.
- Inyecta variables sensibles con secrets (`TF_VAR_grafana_admin_password`, `TF_VAR_key_name`) y pasa `app_image` desde `image_ref`.
- Resultado: crea/actualiza infraestructura AWS y despliega la version de imagen publicada en GHCR.

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
