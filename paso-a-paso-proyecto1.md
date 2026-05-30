# PIN - Proyecto 1

Guía práctica paso a paso basada en la consigna de `consigna.md`.
Objetivo: llegar a una entrega completa y defendible en el final.

## 1. Preparación inicial del repositorio

1. Crear repositorio GitHub del equipo.
2. Definir estructura mínima:
   - `app/` (código de aplicación)
   - `terraform/` (infraestructura)
   - `.github/workflows/` (pipeline)
   - `docs/` (capturas, evidencias)
3. Crear `README.md` con:
   - objetivo del proyecto
   - stack usado
   - cómo ejecutar local y nube
   - enlaces a evidencias
4. Estrategia simple de ramas:
   - usar solo `main`
   - opcional: abrir PR internos para revisar antes de merge

---

## 2. Rúbrica: Pipeline CI/CD (25%)

Meta: workflow que ejecute build, test y deploy correctamente.

### Paso a paso

1. Crear workflow en `.github/workflows/ci-cd.yml`.
2. Configurar triggers:
   - `push` y `pull_request` a `main`.
3. Definir job de `build`:
   - checkout del código
   - instalación de dependencias
   - compilación/build
4. Definir job de `test`:
   - ejecutar tests unitarios
   - publicar reporte si aplica
5. Definir job de seguridad (puede correr entre test y deploy):
   - ESLint o SonarQube
   - Snyk
6. Definir job de `docker`:
   - build de imagen
   - tag con SHA corto
   - push a registry (Docker Hub o GHCR)
7. Definir job de `deploy`:
   - ejecutar `terraform init/plan/apply` (o plan manual + apply aprobado)
   - actualizar `app_image` con tag generado
8. Configurar secretos GitHub:
   - credenciales AWS
   - token Snyk
   - credenciales registry

### Evidencia mínima

- Archivo `.yml` funcionando.
- Captura de workflow en verde con etapas visibles.

---

## 3. Rúbrica: Infraestructura con Terraform (20%)

Meta: Terraform despliega correctamente el entorno (ustedes: AWS).

### Paso a paso

1. En `terraform/`, definir:
   - `providers.tf`
   - `variables.tf`
   - `main.tf`
   - `outputs.tf`
   - `terraform.tfvars.example`
2. Recursos mínimos AWS recomendados:
   - VPC
   - Subnet pública
   - Internet Gateway + Route Table
   - Security Group
   - EC2
3. En `user_data` de EC2:
   - instalar Docker
   - levantar app contenedorizada
   - levantar Prometheus y Grafana
4. Ejecutar validaciones locales:
   - `terraform fmt -recursive`
   - `terraform init`
   - `terraform validate`
   - `terraform plan`
5. Aplicar infraestructura:
   - `terraform apply`
6. Verificar outputs:
   - URL app
   - URL Prometheus
   - URL Grafana

### Evidencia mínima

- Archivos `.tf` en repo.
- Captura de `terraform apply` exitoso.
- URLs funcionando.

---

## 4. Rúbrica: Contenedor Docker (15%)

Meta: imagen reproducible y Dockerfile claro.

### Paso a paso

1. Crear `Dockerfile` en `app/`.
2. Usar imagen base liviana y estable.
3. Definir build reproducible:
   - versiones fijas de dependencias
   - `.dockerignore` para reducir contexto
4. Probar localmente:
   - `docker build -t pin-app:local .`
   - `docker run -p 8080:80 pin-app:local`
5. Publicar en registry desde CI.
6. Versionar imagen por tag:
   - commit SHA
   - opcional: tag semántico

### Evidencia mínima

- `Dockerfile` + `.dockerignore`.
- Captura de build y ejecución exitosa.

---

## 5. Rúbrica: Seguridad (20%)

Meta: SBOM + análisis de código y dependencias dentro del pipeline.

### Paso a paso

1. Análisis estático:
   - ESLint o SonarQube en job dedicado.
2. Dependencias:
   - Snyk scan en pipeline.
3. SBOM:
   - generar CycloneDX o SPDX en cada build.
4. Política mínima de calidad:
   - fallar pipeline si severidad alta/crítica.
5. Publicar artefactos:
   - adjuntar SBOM como artifact del workflow.

### Evidencia mínima

- Reporte ESLint/Sonar.
- Reporte Snyk.
- Archivo SBOM (`.json` o `.xml`).

---

## 6. Rúbrica: Observabilidad (10%)

Meta: dashboard con métricas visibles en Prometheus/Grafana.

### Paso a paso

1. Levantar Prometheus y Grafana (Docker en EC2).
2. Configurar `prometheus.yml`.
3. Si la app expone métricas, agregar target de app.
4. En Grafana:
   - agregar datasource Prometheus
   - crear dashboard básico
5. Dashboard mínimo sugerido:
   - disponibilidad (up)
   - tasa de requests (si existe)
   - uso CPU/memoria de contenedores (si instrumentan cAdvisor/node exporter)

### Evidencia mínima

- Captura del dashboard con datos reales.

---

## 7. Rúbrica: Documentación (10%)

Meta: README claro + evidencias.

### Paso a paso

1. Completar `README.md` con:
   - arquitectura (diagrama simple)
   - prerequisitos
   - pasos de ejecución
   - variables y secretos requeridos
   - troubleshooting básico
2. Guardar evidencias en `docs/`:
   - pipeline en verde
   - `terraform apply`
   - app funcionando
   - dashboard Grafana
   - reportes de seguridad/SBOM
3. Si hacen video, agregar link en README.

### Evidencia mínima

- README completo y ordenado.
- Capturas legibles.

---

## 8. Checklist final antes de comprimir entrega

1. Workflow CI/CD ejecuta build, test, seguridad y deploy.
2. Terraform crea infraestructura en AWS sin errores.
3. Imagen Docker se construye y ejecuta correctamente.
4. SBOM generado y guardado.
5. Dashboard Prometheus/Grafana visible.
6. README actualizado con capturas.
7. Comprimir entrega con nombre:
   - `Proyecto 1_EquipoX.zip` o `Proyecto 1_EquipoX.tar.gz`

---

## 9. Orden recomendado de implementación

1. App mínima + tests.
2. Dockerfile funcional.
3. Terraform AWS funcionando manualmente.
4. Prometheus + Grafana activos.
5. Integrar todo en GitHub Actions.
6. Agregar seguridad y SBOM.
7. Documentar y capturar evidencias.

Este orden reduce bloqueos y permite demostrar avance continuo durante la cursada.
