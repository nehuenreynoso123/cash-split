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

- [ ] T1 — `flujoFondos/store.js`: costo y ganancia congelados por ramificación sobre
      `v.ganancia > 0` en vez de `COALESCE` sobre NULL. **Cambia números históricos
      ya mostrados**; es la corrección correcta, no una regresión.
- [ ] T2 — Verificar con la auditoría cuántos rows tienen `ganancia = 0` (ventas
      heredadas) para dimensionar T1.

### 2. Auditoría read-only (desbloquea el resto)

- [ ] T3 — `backend/scripts/auditar-capital.js`, clonando `auditar-rotacion.js`. Sólo
      SELECT. Debe responder:
      - ¿Desde cuándo hay registros en `liquidez`, `gastos`, `ventas`?
      - `Σingresos(liquidez) + Σ(p.precio × stock)` contra los 7M declarados: ¿coincide?
      - ¿Cuántas ventas tienen `fecha_cobro` NULL vs futura?
      - ¿Cuántas ventas tienen `ganancia = 0`?
      - Cobertura mensual de datos: ¿hay huecos antes de cierta fecha?

### 3. Filtros

- [ ] T4 — Presets de mes en `DateRangeFilter` (`Este mes`, `Mes anterior`,
      `Últimos 3 meses`). El componente se usa en 3 pantallas, todas ganan.
- [ ] T5 — Sincronizar `initialDesde` con cambios del padre (hoy `useState` lo lee una
      vez y nunca se actualiza).

### 4. Comparativa mensual (el pedido original)

- [ ] T6 — `GET /api/comparativa-mensual?meses=6`. Una fila por mes, cada valor del
      mismo tipo:
      - Flujos: ingresos, costo mercadería (congelado), margen bruto, gastos operativos,
        gastos personales, ganancia del negocio.
      - Stocks de cierre: caja, mercadería, capital total.
      - `variacion_absoluta` y `variacion_porcentual` contra el mes anterior.
- [ ] T7 — Vista comparativa en el Dashboard. Reemplaza `SummaryMetrics` y la fórmula
      rota. **Conserva** `CapitalTable` (detalle por producto) como sección secundaria:
      esa tabla sí es útil y el usuario pidió sacar "lo que estaba antes" de las MÉTRICAS,
      no perder el detalle por producto.
- [ ] T8 — Capital histórico: sólo si T3 confirma que `liquidez` tiene fechas confiables.
      Si no, arrancar con el número actual y `capital_snapshots` hacia adelante.

### 5. Fuera de alcance inicial

- [ ] T9 — Devengo de impuestos: campo `periodo_imputacion` en `gastos` + acción
      masiva "el gasto de hoy corresponde al mes pasado". Se deja para después de que
      la comparativa mensual funcione.

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

## Progreso

- T1 ✅ — fix de costo/ganancia congelados aplicado en `flujoFondos/store.js`.

## Próximo paso

T2/T3 — autorización para correr la auditoría read-only contra Neon.
