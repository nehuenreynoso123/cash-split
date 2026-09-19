# Rotación: congelar días cuando el producto se queda sin stock

**Objective:** En la sección Rotación de Mercadería, los días en stock dejan de
acumularse cuando el producto se queda sin stock (stock <= 0). El contador se
congela en el día en que el stock llegó a 0. Si el producto se repone, los días
vuelven a contar desde `fecha_carga` (comportamiento actual).

**Problem:** Hoy `daysInStock()` resta `fecha_carga` de hoy SIEMPRE, aunque el
stock sea 0. Un producto agotado hace semanas sigue sumando días y, al reponerse,
aparece directamente como "Antiguo" porque la base del cálculo quedó vieja.

**Why:** Pedido explícito del usuario: "tienen que dejar de contabilizar los días
a partir de cuando se queda sin stock".

## Scope

- Backend: schema (nueva columna `fecha_agotado DATE` nullable), migración
  idempotente + backfill, stores de `productos` y `ventas` (todas las
  mutaciones de stock), `list()` devuelve `fecha_agotado`.
- Frontend: `Producto` gana `fecha_agotado`; `RotacionClient` congela el
  cálculo de días cuando stock <= 0 y hay fecha de agotamiento.
- NO cambia el badge "Agotado" ni otras secciones.

## Constraints

- Sin concurrencia adicional: cada mutación de stock va seguida de un UPDATE de
  reconciliación de `fecha_agotado` sobre el valor FINAL del stock (nunca
  depender de la evaluación left-to-right de SET en PostgreSQL).
- Migración idempotente, mismo patrón que `fecha_carga` (init.sql + migrate.js).
- Backfill de datos legacy: productos con stock <= 0 sin `fecha_agotado` se
  estampan con CURRENT_DATE (se congelan desde el día del deploy; no hay forma
  de saber cuándo se agotaron realmente).
- Semántica: `fecha_agotado` se estampa la primera vez que stock pasa a <= 0 en
  cada ciclo y se limpia cuando stock > 0 (COALESCE conserva la fecha original
  si el producto ya estaba agotado).
- TDD: OFF (sdd-init cash-split, strict_tdd false, sin runner). Checks
  aplicables: `npm run build` en frontend/ y `node --check` sobre los stores.

## Tasks

- [x] T1 — Schema + migración: `fecha_agotado DATE` nullable en `productos`
      (init.sql CREATE + ALTER idempotente + migrate.js) y backfill
      `UPDATE productos SET fecha_agotado = CURRENT_DATE WHERE stock <= 0 AND fecha_agotado IS NULL`.
- [x] T2 — `productos/store.js`: `add` estampa `fecha_agotado` si stock <= 0 al
      insertar (`CASE WHEN ${stock} <= 0 THEN CURRENT_DATE END`, misma fuente de
      fecha que el resto); `edit` actualiza stock y luego reconcilia
      `fecha_agotado` (UPDATE separado, contrato de fecha_carga preservado).
- [x] T3 — `ventas/store.js`: después de CADA `UPDATE productos SET stock ...`
      (add, addFactura, applyLineWithCurrentCost, restores de updateFactura y
      removeFactura) añadir el UPDATE de reconciliación:
      `UPDATE productos SET fecha_agotado = CASE WHEN stock <= 0 THEN COALESCE(fecha_agotado, CURRENT_DATE) ELSE NULL END WHERE id = <id>`.
- [x] T4 — `productos/store.js` `list()`: agregar `fecha_agotado::date::text AS fecha_agotado`
      al SELECT (activo true y false).
- [x] T5 — Frontend: `Producto` en `api.ts` gana `fecha_agotado: string | null`;
      `RotacionClient.daysInStock(fechaCarga, fechaAgotado, stock)` congela en
      `fechaAgotado` cuando `stock <= 0 && fechaAgotado`, si no sigue a hoy.

## Authorized scope

Implementación completa del cambio descripto. Sin push ni PR: el commit de cierre
lo decide el usuario.

## Acceptance criteria

- Producto con stock 0 y fecha de agotamiento: la columna "Días en stock" no
  crece con el tiempo (se calcula contra la fecha de agotamiento, no contra hoy).
- Producto repuesto (stock > 0): los días vuelven a contar desde `fecha_carga`.
- Un producto que vuelve a agotarse estampa una fecha NUEVA en ese ciclo.
- Legacy (stock 0 antes del deploy): se congela desde el deploy.
- `npm run build` (frontend) y `node --check` sobre los stores pasan.

## Progress

**Estado:** COMPLETADO (2026-09-18). **TDD:** OFF (fuente: sdd-init/cash-split; runner: ninguno).
**Checks:** `npm run build` (frontend/): OK — 13 pages built, Complete!. `node --check`
productos/store.js y ventas/store.js: OK (exit 0) — incluye el re-check tras la
corrección del `add()` (CURRENT_DATE por SQL en vez de toISOString UTC).

- [x] T1
- [x] T2
- [x] T3
- [x] T4
- [x] T5

**Verificación observada:**
- Writer: `npm run build` OK, `node --check` x2 OK.
- Padre: spot check `npm run build` re-corrido → OK. Readback estructural del diff
  completo (6 archivos) → coincide con el diseño. Corrección inline: `add()` usa
  `CASE WHEN ${stock} <= 0 THEN CURRENT_DATE END` (consistente con el resto).
- `gentle-ai review assess`: medium, única razón `.atl/.skill-registry.cache.json`
  (refresh automático del entorno, NO parte del feature; excluido del commit).
  Tier medium → verificación del writer suficiente (model default, no small-profile).
- `.atl/skill-registry.{md,cache.json}` modificados por el entorno (auto-refresh);
  quedan fuera del commit del feature.

**Delivery:** forecast ~150 líneas cambiadas; estrategia `ask-on-risk`; sin chaining.
Commit y push: decisión del usuario.