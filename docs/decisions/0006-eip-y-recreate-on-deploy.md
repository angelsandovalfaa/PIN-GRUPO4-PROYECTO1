# 0006. IP publica estable (EIP) y recrear la instancia en cada deploy

- Estado: Aceptada
- Fecha: 2026-06-02

## Contexto

Dos problemas reales del deploy en AWS, detectados al revisar una instancia viva:

1. **La URL se movia.** La instancia toma una IP publica auto-asignada
   (`map_public_ip_on_launch = true`), que **cambia en cada stop/start o
   recreacion**. Se observo la IP pasar de `34.205.2.74` a `34.236.245.103` entre
   deploys; quien iba a la URL vieja "perdia" Grafana y la app.
2. **La instancia quedaba congelada.** `aws_instance.user_data` solo corre en el
   **primer boot**. Sin `user_data_replace_on_change`, un deploy con imagen nueva
   actualiza el `user_data` en el state pero **no recrea** la instancia ni lo
   re-ejecuta. Evidencia: la instancia corria Grafana 13.0.1 mientras el repo ya
   pinaba 13.0.2 (un cambio mergeado que nunca llego a la instancia). O sea: los
   deploys posteriores al primero no se reflejaban en la infra viva.

## Decision

- **Elastic IP (EIP).** Un `aws_eip` + `aws_eip_association` fija la IP publica.
  La URL deja de moverse, y al recrear la instancia el EIP se reasocia a la
  nueva. Los outputs (`app_url`, `grafana_url`, etc.) pasan a referenciar el EIP.
- **`user_data_replace_on_change = true`.** Cada deploy con imagen nueva cambia
  el `user_data`, lo que **recrea la instancia** y re-corre el bootstrap, asi la
  instancia viva refleja el ultimo deploy. El EIP mantiene la IP estable entre
  recreaciones, anulando el efecto colateral.

Las dos van juntas: el replace sin EIP daria una IP nueva en cada deploy; el EIP
sin replace dejaria la instancia congelada. Combinadas: instancia siempre al dia
y URL estable.

## Alternativas consideradas

- **Dejar la IP auto-asignada (estado previo).** Cero costo, pero la URL se
  mueve en cada reinicio y el evaluador la pierde. Es justo lo que hay que evitar
  para una demo.
- **Deploys sin recrear (estado previo).** La instancia queda congelada en su
  primer boot; los merges de infra no se reflejan. Inaceptable para un entregable
  que se evalua por la infra deployada.
- **Blue-green / recreacion con dos instancias y swap del EIP.** Cero downtime,
  pero suma infraestructura que excede un demo de un solo host.
- **Re-pull/restart en runtime sin recrear** (un agente o cron que actualice el
  compose en la instancia). Evita el downtime, pero suma una pieza fuera de IaC y
  rompe la reproducibilidad "la instancia ES el user_data". El patron del PIN es
  recrear (mismo enfoque que el ADR 0005 del repo propio del equipo).

## Consecuencias

- **A favor:** URL estable (EIP); la instancia viva siempre refleja el ultimo
  deploy.
- **En contra:** cada deploy **recrea la instancia**, con ~2-3 min de downtime
  mientras bootea y corre el `user_data` (pull de imagenes + compose up).
  Aceptable para un demo; es el tradeoff del recreate-on-deploy. Un EIP sin
  asociar tiene costo en AWS, pero aca esta siempre asociado a la instancia.
- El primer `apply` tras este cambio asocia el EIP: la IP publica cambia una vez
  mas (a la del EIP) y a partir de ahi queda fija.
- La implementacion va en el PR que agrega el EIP y `user_data_replace_on_change`.
