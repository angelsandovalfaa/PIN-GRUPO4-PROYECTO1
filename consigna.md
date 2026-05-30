Manual para el alumno: Proyecto Integral
Final (PIN)
Objetivo general del PIN:
Que los estudiantes integren los contenidos vistos en la diplomatura mediante
proyectos prácticos que combinen IaC, CI/CD, contenedores, seguridad y
monitoreo, aplicando buenas prácticas de trazabilidad y entrega continua.
Consigna
Los estudiantes, organizados en equipos, desarrollan los proyectos prácticos
descriptos en este documento. A efectos de la presentación final, eligen un (1)
proyecto, suben el archivo con la documentación (entregables) al drive “PIN”
y lo presentan en el encuentro final como requisito para obtener la
certificación del programa.
Cada proyecto práctico incluye:
●​
●​
●​
●​
●​
Objetivo.
Herramientas a usar (una por categoría, según el programa)
Entregables claros.
Opción local y nube.
Rúbrica de evaluación detallada.
Contenido de cada proyecto práctico:
✔​ Una sola herramienta por categoría (según lo visto en el curso).
✔​ Opción local y opción nube en cada caso.
✔​ Seguridad siempre incluida.
✔​ Aplicación base simple generada con IA (como en el encuentro de IA en
DevOps).
✔​ Rúbrica específica por proyecto práctico.
Proyecto 1: CI/CD con GitHub Actions +
Terraform + Docker
Objetivo​
Construir un pipeline en GitHub Actions que compile, testee y despliegue una
aplicación generada con IA en un contenedor Docker. La infraestructura debe ser
gestionada con Terraform. Incluir controles de seguridad en el pipeline.
Herramientas
●​
●​
●​
●​
●​
CI/CD: GitHub Actions
IaC: Terraform
Contenedores: Docker
Seguridad: SonarQube/ESLint + Snyk
Monitoreo: Prometheus + Grafana
Entregables
Presentar en un archivo comprimido (.zip o .tar.gz) los siguientes elementos:
●​●​●​●​●​Workflow .yml en GitHub Actions.
Archivos Terraform (.tf) para levantar infraestructura.
Dockerfile y artefacto generado.
SBOM (CycloneDX/SPDX).
Captura del dashboard de métricas básicas.
Nombrar el archivo comprimido (ejemplo: Proyecto 1_EquipoX.zip).
Opción local: Docker + Terraform en VirtualBox.​
Opción nube: AWS (si se desea cambiar, consultar al docente).
Rúbrica Proyecto 1
Criterio
 Descripción
 Aporte al
proyecto
Pipeline CI/CD
 Workflow ejecuta build, tests y despliegue
 25%
correctamente
Infraestructura
 Terraform despliega entorno local/nube
 20%
correctamente
Contenedor
 Imagen Docker reproducible, con
 15%
Dockerfile documentado
Seguridad
Observabilidad
Documentación
SBOM + análisis de código/dependencias
en pipeline
Dashboard en Prometheus/Grafana con
métricas visibles
README claro + capturas/video
demostrativo