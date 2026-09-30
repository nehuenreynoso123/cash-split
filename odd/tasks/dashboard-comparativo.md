# Dashboard comparativo mes a mes

## Objetivo

Responder una pregunta que hoy la app no puede contestar: **¿mi negocio creció o shrinks
respecto del mes pasado?**

## Problema

`DashboardClient.tsx:43` calculaba:

```js
liquidezDisponible = totalInversion - totalGastos + netoLiquidezManual
```

Donde `totalInversion` es el valor de la mercadería **de hoy** (`precio × stock`, sin
filtro de fecha) y los otros dos términos son **flujos del período**. Sumar un stock
(point-in-time) con flujos (over-time) mezcla dos magnitudes distintas: el resultado
cambia al tocar las fechas aunque la plata real y el estante no hayan cambiado.

Ejemplo verificado: con 2,0M de mercadería y 500k de caja, se venden artículos que
costaban 1,0M por 1,4M. El capital real de cierre es 2,9M (+400k). El Dashboard con
filtro de septiembre devuelve 1,4M.

`saludCartera` (`DashboardClient.tsx:45`) divide la ganancia del mes contra el stock
**de hoy**: la métrica cambia según el filtro aunque el negocio no haya cambiado.

## Por qué

El usuario administra un negocio de reventa de mercadería. Necesita distinguir:

- **Capital** = plata en mano + mercadería valuada a costo. Es un **stock**: se mide
  en un instante. Comprar mercadería no lo cambia (plata → estante). Venderla lo sube
  sólo por el margen. Los gastos lo bajan.
- **Ganancia del mes** = margen de ventas − gastos del mes. Es un **flujo**.

Regla de diseño: **cada fila de la vista comparativa es un flujo del mes o un stock de
cierre, nunca mezclados en una fórmula.**

## Alcance

### 1. Correcciones de datos (riesgo de reescritura histórica)

- [x] T1 — `flujoFondos/store.js`: costo y ganancia congelados por ramificación sobre
      `v.ganancia > 0` en vez de `COALESCE` sobre NULL. **Cambia números históricos
      ya mostrados**; es la corrección correcta, no una regresión.
- [x] T2 — Verificar con la auditoría cuántos rows tienen `ganancia = 0` (ventas
      heredadas) para dimensionar T1.
      **Resultado: 2 de 161 ventas** con la corrección mal aplicada, ARS 171.558 de
      costo histórico inflado. El resto de las ventas ya traía `ganancia` real.

### 2. Auditoría read-only (desbloquea el resto)

- [x] T3 — `backend/scripts/auditar-capital.js`, clonando `auditar-rotacion.js`. Sólo
      SELECT. Debe responder:
      - ¿Desde cuándo hay registros en `liquidez`, `gastos`, `ventas`?
      - `Σingresos(liquidez) + Σ(p.precio × stock)` contra los 7M declarados: ¿coincide?
      - ¿Cuántas ventas tienen `fecha_cobro` NULL vs futura?
      - ¿Cuántas ventas tienen `ganancia = 0`?
      - Cobertura mensual de datos: ¿hay huecos antes de cierta fecha?

### 3. Filtros

- [x] T4 — Presets de mes en `DateRangeFilter` (`Este mes`, `Mes anterior`,
      `Últimos 3 meses`). El componente se usa en 3 pantallas, todas ganan.
- [x] T5 — Sincronizar `initialDesde` con cambios del padre (hoy `useState` lo lee una
      vez y nunca se actualiza).

### 4. Comparativa mensual (el pedido original)

- [x] T6 — `GET /api/comparativa-mensual?meses=6`. Una fila por mes, cada valor del
      mismo tipo:
      - Flujos: ingresos, costo mercadería (congelado), margen bruto, gastos operativos,
        gastos personales, ganancia del negocio.
      - Stocks de cierre: caja, mercadería, capital total.
      - `variacion_absoluta` y `variacion_porcentual` contra el mes anterior.
      **Implementado** en `backend/api_cash_split/components/comparativaMensual/`.
      **Decisión:** el capital va en un bloque propio (`capital`) FUERA de la serie
      mensual, con `historicoDisponible: false`. Una serie de stocks mixed con
      flujos no es comparable: la app no guarda snapshots, así que cualquier Δ de
      capital sería ruido. El `%` usa `Math.abs(anterior)` y devuelve `null` si el
      mes anterior fue 0.
- [x] T7 — Vista comparativa en el Dashboard. Reemplaza `SummaryMetrics` y la fórmula
      rota. **Conserva** `CapitalTable` (detalle por producto) como sección secundaria:
      esa tabla sí es útil y el usuario pidió sacar "lo que estaba antes" de las MÉTRICAS,
      no perder el detalle por producto.
      **Implementado** en `ComparativaMensual.tsx`. Avisos primero, capital separado,
      tabla mes a mes con deltas, y el detalle aritmético de cada columna debajo.
- [ ] T8 — Capital histórico: sólo si T3 confirma que `liquidez` tiene fechas confiables.
      Si no, arrancar con el número actual y `capital_snapshots` hacia adelante.

### 5. Fuera de alcance inicial

- [ ] T9 — Devengo de impuestos: campo `periodo_imputacion` en `gastos` + acción
      masiva "el gasto de hoy corresponde al mes pasado". Se deja para después de que
      la comparativa mensual funcione.

## Hallazgos de la auditoría (T3) — base de T6

Datos reales, no supuestos. Verificados read-only contra Neon.

| Tabla | Cobertura | Detalle |
| --- | --- | --- |
| `ventas` | 2026-07-08 → 2026-09-29 | 161 ventas, 3 meses comparables |
| `gastos` | 2026-07-01 → 2026-09-30 | 116 gastos |
| `liquidez` | 2026-08-18 → 2026-09-09 | **6 filas, `NOW()`, 0 egresos** |

- **Capital actual: ARS 7.118.443** (3.809.000 de liquidez + 3.309.443 de mercadería),
  1,7% sobre los 7M declarados. Confirma el número del usuario.
- **No existe histórico de capital confiable.** `liquidez` tiene 6 registros y su
  `fecha` es el `NOW()` del insert, no el del movimiento. Por eso T8 arranca con
  `capital_snapshots` hacia adelante, no con backfill.
- Ingresos: julio 4.820.968 · agosto 8.900.980 · septiembre 8.244.466.
- Margen bruto: julio 997.540 · agosto 2.429.522 · septiembre 2.644.943.
- 23 ventas pendientes de cobro por 2.409.209; 138 cobradas; ninguna sin `fecha_cobro`.
- `costo_invertido_stock` en `flujoFondos` sigue siendo el stock **de hoy** sin
  dimensión temporal. Los presets de fecha no arreglan esa tarjeta: hay que sacarla del
  eje temporal o etiquetarla explícitamente como "stock actual".

## Prerrequisito de T6: clasificación de gastos

`gastos.tipo` estaba NULL en **116 de 116** filas y 70 no tenían categoría, con
consumo personal mezclado con monotributo. Sin esto, Punto de Equilibrio no puede
separar fijos de variables.

Pre-clasificación aplicada con `backend/scripts/preclasificar-gastos.js`. Decisiones
del usuario:

- `nafta` = **personal** (no es combustible de reparto).
- `seguro auto` = **servicios / fijo**. Precedente: toda categoría `servicios` es **fijo**.
- `monotributo` = **fijo**; `percepciones` = **variable**.

**Estado: 103 de 116 clasificados. Quedan 13 sin resolver, 751.181,22:**

| Grupo | Registros | Monto | Por qué sigue abierto |
| --- | --- | --- | --- |
| `impuestos` (4 filas) | 48, 80, 94, 95 | 487.919,22 | No se sabe cuál impuesto es: cuota fija vs % sobre venta |
| `lavarropa` (3 filas) | 14, 18, 26 | 97.262 | Arreglo doméstico vs herramienta de trabajo |
| Plataformas (6 filas) | 8, 17, 19, 29, 67, 96 | 166.000 | Probablemente ya liquidadas en `ventas_facturacion` → contarlas dos veces |

**Regla para T6/T7: los 13 pendientes se muestran como línea explícita "sin
clasificar". Nunca se incluyen ni se excluyen en silencio.** Es la misma lección del
Dashboard roto: un número sin decir qué le falta es un número engañoso.

## Restricciones

- **Sin acceso remoto sin autorización.** `DATABASE_URL` apunta a Neon productivo. La
  auditoría necesita OK explícito antes de correr.
- **No hay test runner en el repo.** Checks disponibles: `npx tsc --noEmit`,
  `npm run build`, funciones puras, scripts read-only. No inventar cobertura.
- **No reescribir histórico a mano.** El fix T1 es determinístico y se recalcula; no
  requiere migraciones de datos.
- Artefactos técnicos en inglés o español según el proyecto existente; el código usa
  comentarios en español.

## Criterios de aceptación

1. El Dashboard **no** muestra ninguna fórmula que sume un stock con un flujo.
2. Existe una comparación mes-a-mes visible con Δ absoluto y Δ%.
3. Los presets de mes funcionan en las 3 pantallas que comparten `DateRangeFilter`.
4. Editar el costo de un producto **no** cambia la ganancia de meses ya cerrados.
5. Una venta con `ganancia = 0` no infla su propio costo al 100% del precio.
6. `tsc` y `build` pasan después de cada tarea.

## Verificación

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```

Scripts de contraste contra la base real (ambos **sólo lectura**):

```bash
node --env-file=backend/.env backend/scripts/probar-comparativa.js
node --env-file=backend/.env backend/scripts/smoke-comparativa.js
```

`probar-comparativa.js` no se limita a verificar que las cuentas cierren: una cuenta
puede cerrar perfecto con el campo equivocado. Además ata el store a las cifras ya
verificadas a mano en T3, así una regresión de lectura se ve aunque las fórmulas sigan
cuadrando. `smoke-comparativa.js` monta los routers sobre express **sin** llamar a
`runMigrations()`, porque `app.js` corre migraciones en el import y eso es DDL.

## Progreso

- T1 ✅ — commit `af3bcb5`. Fix de costo/ganancia congelados en `flujoFondos/store.js`.
- T2 ✅ — 2 de 161 ventas afectadas, ARS 171.558 de costo inflado.
- T3 ✅ — commit `208b870`, `backend/scripts/auditar-capital.js`.
- T4 ✅ — commit `85d2c78`, presets en `DateRangeFilter`.
- T5 ✅ — commit `85d2c78`, `initialDesde` sincronizado con `useEffect`.
- Clasificación de gastos ✅ en DB — commit `3d94ed4` (script), `91eb280` (fix de reglas).
  103/116 resueltas.
- T6 ✅ — `backend/api_cash_split/components/comparativaMensual/` + ruta en `routes.js`.
  Verificado end-to-end con `scripts/smoke-comparativa.js` (401 sin token, 200 con
  token, `meses` acotado a 1–12). Sin commit.
- T7 ✅ — `ComparativaMensual.tsx`; `DashboardClient.tsx` reescrito; `SummaryMetrics.tsx`
  eliminado; `CapitalTable.tsx` conservado como sección secundaria. Sin commit.
- T8 🔲 pendiente — `liquidez` sin histórico confiable. Se implementó la parte que
  NO requiere migración (capital actual con `historicoDisponible: false`); falta la
  tabla `capital_snapshots` hacia adelante.
- T9 🔲 fuera de alcance inicial.

## Próximo paso

T8 — crear `capital_snapshots` y snapshots desde hoy. Es una migración, así que quedó
pendiente a propósito: esta tanda de trabajo era sólo lectura de base.
