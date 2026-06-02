# 0001. Proxy de clima a Open-Meteo con cache Redis opcional y degradacion elegante

- Estado: Aceptada
- Fecha: 2026-06-02

## Contexto

La app del repo era un stub: el endpoint `/` devolvia `{ ok, delay }` con un
delay random para simular latencia (`app/src/app.js:187-194`). Sirve para
ejercitar el pipeline y las metricas HTTP genericas, pero no hace nada real, no
tiene dependencias que observar y no cuenta una historia en la defensa del PIN.

La consigna pide una "app simple generada con IA". Necesitabamos darle una
funcion real (que justifique cache, upstream y metricas de negocio) sin
convertirla en un sistema complejo ni cambiar el stack que el resto del repo ya
soporta (Node + Express, un solo contenedor).

## Decision

Convertir la app en un **proxy de clima a Open-Meteo con cache-aside en Redis**.
`GET /weather?city=<conocida>` o `?lat=&lon=` resuelve coordenadas, consulta
Open-Meteo y cachea el resultado (`app/src/app.js:120-149`). Decisiones clave:

- **Una sola fuente upstream** (Open-Meteo, API publica sin key). Se evaluo
  multi-fuente y se descarto (ver Alternativas).
- **Cache Redis opcional con degradacion elegante**: si `REDIS_URL` no esta o la
  conexion falla, la app arranca igual y `/weather` responde directo del
  upstream en vez de fallar. La logica vive en `app/src/cache.js`:
  `connectCache()` traga el error de conexion y deja la app sin cache
  (`cache.js:36-40`), y `getCache()` devuelve `null` si la cache no esta arriba
  (`cache.js:48`). El cache se inyecta en `createApp({ cache })`
  (`app/src/app.js:114`) para poder testear sin Redis real.
- **Observabilidad de negocio**: `cache_hits_total`, `cache_misses_total`,
  `upstream_requests_total{status_code}`, `upstream_request_duration_seconds` y
  `dependency_up{dependency="redis"}` sobre el registry de Prometheus existente
  (`app/src/app.js:29-60`). `/health` refresca `dependency_up` en cada chequeo
  (`app/src/app.js:199`).
- **Validacion de input**: allowlist de ciudades (`app/src/app.js:67-74`) y
  rangos de lat/lon; input invalido devuelve `400` y nunca se usa input crudo
  para construir la URL del upstream.
- **En JavaScript por ahora.** La migracion a TypeScript reescribira esto y se
  consensua con el equipo aparte (ver Consecuencias).

## Alternativas consideradas

- **Reusar `pokedex-api` como la app.** Es una API real y madura, pero es
  stateful (Mongo + Redis + auth), vive en otro repo y romperia la consigna de
  "app simple": meteria una base de datos, migraciones y autenticacion que el
  meta-repo no necesita para demostrar el pipeline. Sobreingenieria para el
  alcance.
- **Multi-fuente de clima (varios proveedores).** Se evaluo mostrar el clima
  segun distintas fuentes. Agrega normalizacion entre APIs heterogeneas,
  manejo de varias keys y mas modos de falla, sin sumar nada a lo que la rubrica
  evalua. Una sola fuente alcanza para demostrar proxy + cache + metricas.
- **Cache obligatorio (la app no arranca sin Redis).** Mas simple de razonar,
  pero acopla el arranque a una dependencia que para tests y dev local es
  innecesaria. La degradacion elegante permite correr la app sola.
- **Cache in-memory (un Map en el proceso).** Cero infraestructura, pero no
  sobrevive reinicios, no se comparte entre instancias y no da metricas reales
  de un sistema de cache. Redis en contenedor da esa observabilidad, que
  alimenta el dashboard.

## Consecuencias

- **A favor:** la app hace algo real y observable; corre con o sin Redis; los
  tests cubren hit, miss, bypass sin cache, validacion y error de upstream con
  `fetch` y la cache mockeados, sin necesitar red ni Redis. El TTL es
  configurable por env (`REDIS_TTL`).
- **En contra:** hay dos caminos de codigo (con y sin cache) que mantener y
  testear; el path sin cache es el degradado, con su propio test. Una falla de
  Redis en runtime tambien cae al bypass (se loguea como warning), priorizando
  disponibilidad sobre cache.
- **Retrabajo conocido:** escribir esto en JavaScript ahora implica que la
  migracion a TypeScript (pendiente, a consensuar con el equipo porque cambia el
  stack) lo reescribira. El costo incremental es bajo: la logica se reusa.
- Queda pendiente el rename del servicio `pin-app` a `weather-app`, que se
  pliega a esa misma modernizacion (toca la imagen GHCR y el job de Prometheus,
  no se hace suelto).
