# terraform/

## Funcion principal

Define infraestructura como codigo separada por entorno para cumplir la consigna de opcion local y opcion nube. El state para aws se encuentra alamacenado en un bucket de s3.

## Subcarpetas

- `local/`: stack local con provider Docker.
- `aws/`: infraestructura cloud en AWS.
- `bootstrap/`: crea el backend remoto (bucket S3 del state + tabla DynamoDB de lock) que usa `aws/`. State local, se corre una sola vez desde el workflow `42-pipeline-bootstrap-aws.yml`. Ver `bootstrap/README.md` y el ADR 0004.

## Como se vinculan

- Ambos entornos comparten plantillas desde `monitoring/templates/` para mantener consistencia operativa.
- `bootstrap/` provisiona el backend antes de que `aws/` pueda guardar su state ahi (problema del huevo y la gallina; ver ADR 0004).
- El pipeline CI/CD despliega el entorno `aws/` en rama `main`.
- El entorno `local/` se usa para pruebas rapidas previas sin costo cloud.
