# terraform/

## Funcion principal

Define infraestructura como codigo separada por entorno para cumplir la consigna de opcion local y opcion nube.

## Subcarpetas

- `local/`: stack local con provider Docker.
- `aws/`: infraestructura cloud en AWS.

## Como se vinculan

- Ambos entornos comparten plantillas desde `compose/` para mantener consistencia operativa.
- El pipeline CI/CD despliega el entorno `aws/` en rama `main`.
- El entorno `local/` se usa para pruebas rapidas previas sin costo cloud.
