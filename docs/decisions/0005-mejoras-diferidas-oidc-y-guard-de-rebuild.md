# 0005. Mejoras diferidas: OIDC y guard de rebuild de imagen

- Estado: Aceptada
- Fecha: 2026-06-02

## Contexto

Una auditoria de practicas DevOps sobre el repo identifico dos mejoras reales
que **se decide no implementar ahora**. Este ADR las registra para que queden
como deuda conocida y acotada, con su razon y su disparador de revision, en vez
de perderse o reaparecer como "esto deberia estar".

## Decision

Diferir las dos, de forma deliberada, hasta despues de la presentacion del PIN.

### 1. OIDC para AWS

Seguir usando **access keys de larga vida** en secrets (`AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`) en `40`/`41`/`42`, en lugar de federacion OIDC
(`id-token: write` + `role-to-assume`).

Por que diferir: migrar a OIDC cerca de la entrega es una **puerta de una via**
con riesgo de romper el deploy en plena demo (rol mal configurado, trust policy,
condiciones del `sub`). El beneficio de seguridad no compensa el riesgo a la
presentacion. El repo propio del equipo tomo la misma decision. Mitigacion
mientras tanto: rotar las keys y mantener el IAM user con permisos acotados.

Disparador de revision: despues de la presentacion.

### 2. Guard de rebuild de imagen

Hoy el job `30-pipeline-docker-publish.yml` reconstruye la imagen en cada push a
`main`, aunque el cambio no toque `app/` (por ejemplo, solo `terraform/` o
`monitoring/`). El filtro de paths `changes` (que evita deploys por cambios
triviales) solo gatea el **deploy** (`40`), no el **build** (`30`).

Por que no es un one-liner: el deploy y el build estan acoplados. El `40`
deploya `image_ref`, que es la salida del `30`. Si se gatea el `30` por paths de
`app/`, en un push que toca solo infra el deploy se quedaria sin imagen
(`image_ref` vacio) y Terraform aplicaria el default. El fix correcto desacopla
build de deploy: taggear la imagen por el ultimo commit que toco `app/` (la
"version de la app"), que el `30` exponga ese ref siempre y buildee solo cuando
`app/` cambia, asi en cambios de infra el tag ya existe y no se rebuildea.

Por que diferir: es un cambio en el corazon del pipeline (como el deploy resuelve
la imagen), con riesgo cerca de la entrega, contra un costo bajo (unos minutos de
CI y tags redundantes en GHCR; no rompe nada). Por proporcionalidad, despues.

Nota: el repo propio del equipo no tiene este problema porque ahi la imagen la
construye el repo de la app, no el de infra; aca app e infra viven juntos y por
eso aparece el acople.

Disparador de revision: despues de la presentacion.

## Alternativas consideradas

- **Implementarlas ahora.** Lo "correcto" en abstracto, pero ambas tocan partes
  sensibles (credenciales del deploy, resolucion de imagen) a pocos dias de la
  defensa. El riesgo a la demo supera el upside.
- **No documentarlas.** Se pierden, o reaparecen como hallazgos sin contexto en
  una proxima auditoria. El ADR las fija como decision, no como olvido.

## Consecuencias

- **A favor:** deuda explicita y acotada, con disparador de revision claro; no se
  asume riesgo cerca de la entrega.
- **En contra:** las keys de larga vida siguen siendo un gap de seguridad
  (mitigado con rotacion); el rebuild redundante gasta algunos minutos de CI y
  ensucia GHCR con tags identicos en pushes que no tocan la app.
- Cuando se retomen, cada una merece su propio PR (y, si cambia algo de fondo, su
  ADR que supere a este en la parte que corresponda).
