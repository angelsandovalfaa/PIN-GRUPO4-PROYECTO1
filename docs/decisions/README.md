# Architecture Decision Records

Registro de las decisiones de arquitectura del repo: por que la app, la infra y
la exposicion de red son como son. Cada ADR captura una decision con sus
alternativas reales y el tradeoff que asumimos, para que dentro de unos meses (o
en la defensa del PIN) se entienda el porque sin arqueologia.

## Criterio: cuando una decision merece un ADR

Una decision se documenta como ADR si cumple al menos dos de estas tres:

1. **Habia alternativas reales.** Se eligio entre opciones con tradeoffs, no fue
   el unico camino posible.
2. **Alguien querria romperla en 3 meses sin entender por que.** Si el cambio
   parece "obvio" pero rompe algo no evidente, el ADR lo previene.
3. **El "por que" se olvida facil.** La razon no es deducible del codigo solo.

Lo que es consecuencia tecnica forzada o best practice estandar de bajo riesgo
no lleva ADR: vive en el README o en un comentario inline.

## Indice

| ADR | Decision |
|---|---|
| [0001](0001-weather-proxy-open-meteo-redis-cache.md) | Proxy de clima a Open-Meteo con cache Redis opcional y degradacion elegante |
| [0002](0002-network-exposure-auth-over-ip-allowlist.md) | Exposicion de red: autenticacion sobre allowlist de IP, servicios internos no expuestos, SSH por SSM |

## Formato

Cada ADR sigue la misma estructura: Contexto, Decision, Alternativas
consideradas, Consecuencias. Estado y fecha en el encabezado.
