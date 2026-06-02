# 0003. Rollback por redeploy de una imagen previa

- Estado: Aceptada
- Fecha: 2026-06-02

## Contexto

El deploy a AWS (`40-pipeline-deploy-aws.yml`) corre en cada push a `main` que
toque infra o el codigo de la app, y siempre usa la imagen recien construida: el
job `30-pipeline-docker-publish.yml` taggea `ghcr.io/<owner>/pin-app:<short-sha>`
con el SHA del commit y se la pasa al deploy via `image_ref`
(`00-pipeline-orchestrator.yml`).

El problema: si un deploy a `main` rompe la app, no habia forma de volver a una
version estable sin hacer un commit nuevo y esperar todo el pipeline (build,
test, sbom, docker, deploy). En medio de una demo eso es lento y arriesgado. La
imagen vieja, buena, ya esta publicada en GHCR con su tag de SHA, pero nada la
re-deploya.

## Decision

Un workflow manual `50-pipeline-rollback-aws.yml` (`workflow_dispatch`) que
recibe un tag o short-SHA ya publicado en GHCR y redeploya esa imagen
**reusando el mismo deploy `40`**, sin pasar por build/test/docker. Solo cambia
la variable `app_image` de Terraform; el `terraform apply` es el mismo que el del
pipeline normal.

Detalles de la decision:

- **Confirmacion explicita**: hay que escribir `ROLLBACK` en un input, mismo
  patron que el `confirm_destroy` del destroy, para evitar disparos accidentales.
- **Validacion del tag (anti inyeccion)**: el input se lee por env var y se valida
  contra el formato de tag de Docker antes de construir el `image_ref`, porque ese
  ref termina interpolado en el `terraform apply -var=...` del `40`. Sin la
  validacion, un tag con metacaracteres seria un vector de inyeccion de shell.
- **Concurrency compartida**: el `40` usa un group estatico `terraform-aws`
  (no por `github.workflow`), asi el deploy normal y el rollback comparten cola y
  no corren a la vez compitiendo por el lock de DynamoDB del state.

## Alternativas consideradas

- **Blue-green o canary.** El rollback "de manual": cero downtime y reversion
  instantanea. Pero suma infraestructura (dos entornos, un balanceador o weights)
  que excede un demo efimero de un solo host EC2. No se justifica para el PIN.
- **Revertir el commit y dejar que el pipeline redeploye.** Funciona pero es
  lento (rebuild completo) y no sirve si el deploy malo ya esta en produccion y
  hay que bajarlo *ya*. Ademas reconstruye una imagen identica a una que ya
  existe.
- **No tener rollback.** El estado previo. Ante un deploy roto, la unica salida
  era un commit nuevo o un destroy. Riesgo innecesario teniendo las imagenes
  viejas inmutables a un `apply` de distancia.

## Consecuencias

- **A favor:** vuelta rapida a una version estable sin rebuild; reusa el deploy
  ya probado (no duplica logica de Terraform); los tags por SHA son inmutables,
  asi que se redeploya exactamente lo que se quiere.
- **En contra:** el operador tiene que conocer un short-SHA bueno (se ve en
  Packages de GHCR o en el run de `30` que lo publico); no hay validacion previa
  de que el tag exista en el registry, asi que un tag inexistente deja la imagen
  sin poder bajarse en la instancia. El proximo push a `main` vuelve a pisar con
  la imagen nueva (comportamiento esperado).
- El rollback cubre "la imagen nueva rompio". Si lo que rompe es un cambio de
  infra, la herramienta es corregir y redeployar, o el destroy; no este workflow.
- La implementacion fue en el PR del rollback (workflow `50` + el group estatico
  del `40`). Este ADR es el porque.
