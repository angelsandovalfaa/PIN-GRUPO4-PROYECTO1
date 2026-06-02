# 0002. Exposicion de red: autenticacion sobre allowlist de IP, servicios internos no expuestos, SSH por SSM

- Estado: Aceptada
- Fecha: 2026-06-02

## Contexto

El modulo `terraform/aws` levanta una EC2 con IP publica. Su security group
abre todos los puertos (SSH 22, app, Prometheus, Grafana, cAdvisor 8081,
node-exporter 9100, ICMP) contra una sola variable `var.allowed_cidr` cuyo
default es `0.0.0.0/0` (`terraform/aws/main.tf:89-160`). Es decir: hoy todo,
incluidos los puertos de administracion y de metricas, esta abierto a internet.

La tension: la app (el producto) y el dashboard de Grafana tienen que ser
accesibles para el equipo y para quien evalue el PIN, pero **la IP del evaluador
no se conoce y ademas las IP son dinamicas**. Un allowlist por IP, que es la
reaccion intuitiva al `0.0.0.0/0`, no resuelve el acceso de un tercero
desconocido: no hay IP estable que poner en la lista.

Ademas, al revisar el codigo se confirmo que tres de esos servicios no necesitan
puerto publico para nada:

- Grafana consulta a Prometheus por la red interna de Docker
  (`monitoring/provisioning/datasources/prometheus.yml`: `url:
  http://prometheus:9090`, `access: proxy`, server-side).
- Prometheus scrapea a la app, cAdvisor y node-exporter por nombre de servicio
  en la red interna (`monitoring/templates/prometheus.yml.tftpl`), no por el
  puerto del host.

O sea: a Prometheus, cAdvisor y node-exporter nadie les pega desde afuera; sus
metricas se ven a traves de Grafana.

## Decision

Separar la exposicion **por sensibilidad**, sin depender de conocer la IP de
nadie. Para algo que debe ver un tercero desconocido, la herramienta correcta es
**autenticacion, no una ACL de red**:

- **App (80): publica** (`0.0.0.0/0`). Es el producto; el equipo y el evaluador
  pegan a `/weather`, `/health`, `/metrics` desde cualquier IP.
- **Grafana (3000): publica en modo solo-lectura.** Acceso anonimo con rol
  Viewer (`GF_AUTH_ANONYMOUS_ENABLED=true`, `GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer`):
  quien evalua ve el dashboard sin cuenta ni login, desde cualquier IP. La
  cuenta admin queda protegida por password (secret, no `admin123`) para editar,
  y el alta de usuarios deshabilitada (`GF_USERS_ALLOW_SIGN_UP=false`). No hace
  falta una cuenta de revision ni compartir credenciales: es el patron estandar
  de dashboard publico de Grafana, y es seguro aca porque las metricas no son
  sensibles y la datasource de Prometheus es interna.
- **Prometheus (9090), cAdvisor (8081), node-exporter (9100): no expuestos.** Se
  quitan sus reglas de ingress del security group (el SG es el unico control
  real de exposicion a internet; el datasource y el scrape son internos y siguen
  funcionando). Tres findings eliminados con cero impacto en pruebas.
- **SSH (22): por SSM Session Manager**, con el puerto 22 cerrado. La EC2 lleva
  un IAM role con la policy `AmazonSSMManagedInstanceCore` y el agente SSM (ya
  preinstalado en Amazon Linux 2023); el acceso se controla por IAM y queda
  auditado en CloudTrail. No hay bastion ni llaves ni puerto de SSH abierto.

Con esto `var.allowed_cidr` deja de ser necesaria para el acceso de terceros.

## Alternativas consideradas

- **Allowlist por IP (lista de CIDR del equipo + evaluador).** Es lo que pide a
  gritos el `0.0.0.0/0`, pero no sirve para el caso real: no se conoce la IP del
  evaluador y las IP son dinamicas, asi que la lista quedaria desactualizada o
  habria que tenerla abierta igual. El allowlist solo aplica bien a lo que uno
  mismo controla, y aun ahi la IP dinamica lo hace molesto.
- **Dejar todo publico (`0.0.0.0/0`, estado actual).** Comodo, pero expone un
  Prometheus sin auth, cAdvisor, node-exporter y el puerto de SSH a todo
  internet. Es justo el tipo de hallazgo que cuesta puntos en el criterio de
  seguridad (20% de la rubrica) y mala practica sin upside.
- **VPN o bastion host.** El acceso administrado "de manual", pero suma
  infraestructura y operacion que excede el alcance de un demo efimero del PIN.
  SSM da acceso auditado sin nada de eso.
- **SSH restringido a un `ssh_cidr` (interim).** Mejor que `0.0.0.0/0`, pero con
  IP dinamica hay que reaplicar seguido y sigue habiendo un puerto de admin
  abierto. SSM lo elimina del todo, por eso se eligio SSM directamente.

## Consecuencias

- **A favor:** ningun puerto de administracion ni de metricas queda expuesto a
  internet; SSH sin puerto abierto y con acceso auditado; quien evalua ve la app
  y el dashboard por URL desde cualquier IP, sin cuenta ni que tengamos que
  conocer su direccion. Mejora directa del criterio de seguridad.
- **En contra:** el dashboard queda legible por cualquiera (es el costo de que
  sea publico de solo-lectura); es aceptable porque las metricas no son sensibles
  y el anonimo es Viewer, asi que no puede editar ni configurar. El peso recae en
  que la cuenta admin tenga password fuerte por secret. SSM agrega un IAM role e
  instance profile al modulo (esfuerzo medio, no "barato"). Ver Prometheus
  directo ahora requiere entrar por SSM y consultar `localhost:9090`, en vez de
  abrirlo en el navegador.
- TLS por delante de Grafana (reverse proxy con Let's Encrypt) es la mejora
  natural siguiente; requiere un dominio, asi que queda como opcional fuera de
  esta decision.
- La implementacion va en el PR de hardening de red (security group, IAM role de
  SSM y endurecimiento de Grafana). Este ADR es el porque; el PR es el como.

## Referencias

- Grafana, configure security:
  https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/
- Grafana detras de reverse proxy con auth y TLS (Alex Ellis):
  https://blog.alexellis.io/expose-grafana-dashboards/
- AWS Systems Manager, security best practices (cerrar puertos de entrada):
  https://docs.aws.amazon.com/systems-manager/latest/userguide/security-best-practices.html
- AWS Systems Manager Session Manager:
  https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
