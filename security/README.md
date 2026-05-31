# security/

## Funcion principal

Agrupa artefactos y evidencias de seguridad del proyecto.

## Subcarpetas

- `sbom/`: SBOM generado en formato CycloneDX/SPDX.
- `snyk/`: evidencias de escaneo de vulnerabilidades de dependencias.
- `sonar/`: evidencias/configuracion de analisis estatico si se usa Sonar.

## Vinculos

- `.github/workflows/ci-security-sbom.yml` ejecuta ESLint/Snyk y genera SBOM.
- `docs/screenshots/` puede incluir capturas complementarias de seguridad.
