# 0004. Backend remoto de Terraform como IaC (modulo bootstrap)

- Estado: Aceptada
- Fecha: 2026-06-02

## Contexto

El modulo `terraform/aws` usa un backend remoto S3 + lock en DynamoDB
(`providers.tf` con `backend "s3" {}`, configurado por `-backend-config` en el
deploy `40-pipeline-deploy-aws.yml`). Pero el bucket del state y la tabla de lock
se asumian **creados a mano**: no existian como codigo. Es el problema del huevo
y la gallina: el modulo `aws` guarda su state en ese bucket, pero el bucket hay
que crearlo con algo antes de que exista el state.

Tener el backend fuera de IaC es fragil: no es reproducible (si se pierde el
bucket, hay que recrearlo a mano y acordarse de la config de versionado, cifrado
y bloqueo de acceso), y va en contra del criterio de Infraestructura como Codigo
de la rubrica.

## Decision

Un modulo `terraform/bootstrap` con **state local** que crea el backend que
despues consume el modulo `aws`:

- **Bucket S3** del state: versionado, cifrado (AES256), acceso publico
  bloqueado y policy que niega todo lo que no sea TLS.
- **Tabla DynamoDB** de lock (`LockID`, `PAY_PER_REQUEST`).
- Ambos con `prevent_destroy`: un `terraform destroy` del modulo `aws` no se los
  lleva, el state sobrevive al ciclo de vida de la app.

Se corre desde un workflow manual `42-pipeline-bootstrap-aws.yml`
(`workflow_dispatch`, confirmacion `BOOTSTRAP`), una sola vez. El workflow
**importa** el bucket y la tabla si ya existen antes del `apply`, asi es
idempotente aun con el state local efimero del runner (cada run arranca sin
state, por eso importa en cada corrida). Los nombres salen de los secrets
`TF_STATE_BUCKET` / `TF_LOCK_TABLE`, los mismos que usa el deploy, para que no
haya drift de nombres. El provider es `hashicorp/aws ~> 5.0`, alineado con
`terraform/aws` (no se introduce un segundo major).

El control de bootstrap se expone como **workflow separado**, no como un input
`action` en el orquestador (que es como lo hace el repo propio del equipo). Se
eligio separado por ser menos invasivo (no toca el orquestador) y mas
descubrible (su propio boton "Run workflow").

## Alternativas consideradas

- **Crear el backend a mano / por CLI (estado previo).** Lo que se quiere
  arreglar: no versionado, no reproducible, facil de configurar mal (olvidar el
  versionado o el bloqueo de acceso publico del bucket del state).
- **Input `action` unificado en el orquestador** (bootstrap/apply/destroy en un
  dropdown, como el repo propio del equipo). Da paridad, pero obliga a cirugia en
  el orquestador (gatear la cadena CI en `workflow_dispatch`, sumar jobs) y
  acopla mas cosas a un archivo sensible. Para este repo, workflows separados son
  mas simples y de menor riesgo.
- **Backend con state local commiteado, o sin lock.** Mas simple pero pierde el
  lock (riesgo de corrupcion con dos applies en paralelo) y el state versionado.
  No aplica para un repo de equipo.

## Consecuencias

- **A favor:** backend reproducible y versionado como cualquier otro recurso;
  `prevent_destroy` protege el state ante un destroy de la app; el import
  idempotente permite adoptar un bucket/tabla ya creados a mano sin romper.
- **En contra:** hay que correr el bootstrap una vez de forma manual y verificar
  que los nombres de los secrets coincidan con los recursos; borrar el backend de
  verdad requiere quitar `prevent_destroy` y vaciar el bucket (tiene versiones) a
  mano, no es parte del flujo normal (documentado en `terraform/bootstrap/README.md`).
- La implementacion fue en el PR del bootstrap (modulo `terraform/bootstrap` +
  workflow `42`). Este ADR es el porque.
