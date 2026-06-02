# terraform/bootstrap

Crea el **backend remoto** que usa el modulo [`../aws`](../aws): el bucket S3
donde vive el state y la tabla DynamoDB que lo lockea. Es el problema del huevo
y la gallina: el modulo `aws` guarda su state en ese bucket, pero el bucket hay
que crearlo antes con algo. Este modulo lo crea con **state local**, una sola
vez.

## Que crea

- **Bucket S3** del state: versionado, cifrado (AES256), acceso publico
  bloqueado y policy que niega todo lo que no sea TLS.
- **Tabla DynamoDB** de lock (`LockID`, `PAY_PER_REQUEST`).

Ambos con `prevent_destroy`: un `terraform destroy` del modulo `aws` no los
borra, asi el state sobrevive al ciclo de vida de la infra de la app.

## Como se corre

Desde el pipeline, no a mano. Los nombres del bucket y la tabla **deben coincidir
exactamente** con los secrets que ya consume el deploy:

| Variable del modulo | Secret del repo |
|---|---|
| `state_bucket_name` | `TF_STATE_BUCKET` |
| `lock_table_name`   | `TF_LOCK_TABLE`  |
| `aws_region`        | `AWS_REGION`     |

Si difieren, el `terraform init` del deploy apuntaria a un backend distinto. Por
eso `state_bucket_name` y `lock_table_name` no tienen default: hay que pasarlos.

El reusable que lo invoca hace `import` del bucket y la tabla antes del `apply`,
asi es idempotente: si ya existen (por ejemplo creados a mano), los adopta en vez
de fallar con "already exists". El state local del runner es efimero, por eso el
import corre en cada ejecucion.

## Borrar el backend de verdad

`prevent_destroy` impide borrarlo por accidente. Para eliminarlo a proposito hay
que quitar el `prevent_destroy`, vaciar el bucket (tiene versiones) y recien ahi
destruirlo. No es parte del flujo normal.
