# Gastos: categorías (personal / emprendimiento / servicios)

**Objective:** Cada gasto de la sección Gastos puede llevar una categoría de
entre tres: **Gastos personales**, **Emprendimiento**, **Servicios**. La sección
pasa a mostrar el total desglosado por categoría y a permitir filtrar la tabla
por una categoría.

**Problem:** Hoy la sección Gastos es una lista plana con un único total. No hay
forma de saber cuánto de lo que se gastó fue del negocio y cuánto fue personal.
Esa distinción es la que hace que el número sea accionable; sin ella el total es
una cifra sin lectura.

**Why:** Pedido explícito del usuario: "necesito poder asignarle una categoría a
cada gasto. las categorías son gastos personales, emprendimiento y servicios".
Y aclarado en la pregunta de alcance: quiere **ver los totales por categoría** y
**filtrar por categoría**, no solo guardar el dato.

## Scope

- Backend: columna `categoria` en `gastos` + garantía de dominio, migración
  idempotente, `add`/`update`/`list` con categoría, totales por categoría.
- Frontend: `Gasto.categoria`, tarjetas de totales por categoría, dropdown de
  filtro, badge en la tabla, `<select>` en el modal.
- NO toca dashboard, flujo de fondos ni calculadora: la tabla `gastos` no la lee
  ningún otro componente (verificado por grep — el único consumidor es
  `cajaGastosOperativos`).

## Decisiones de diseño

- **Slugs en DB, labels en UI.** Se guardan `'personal' | 'emprendimiento' |
  'servicios'`, no los textos en español. Mismo patrón que `liquidez.tipo`
  (`'ingreso' | 'egreso'`): cambiar el label después no obliga a migrar datos.
- **CHECK constraint en DB** sobre el dominio de 3 valores: la integridad no
  depende de que el frontend se porte bien. Idempotente vía
  `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`.
- **Nulos, no backfill inventado.** `categoria` es NULLABLE. Los gastos ya
  cargados NO se pueden clasificar solos (no hay forma de saber si un gasto viejo
  fue personal o del negocio) y etiquetarlos con un default sería mentir en los
  datos. Se muestran como "Sin categoría" y, si hay filas legacy, aparece una
  cuarta tarjeta con ese total.
- **Totales por categoría respetan el rango de fechas** pero NO la paginación
  (un breakdown de una página de 15 filas no sirve de nada). Sí respetan el
  filtro de categoría: las tarjetas siempre muestran las 4, con la activa
  resaltada, así el breakdown nunca se oculta.
- **El total grande del header NO cambia**: sigue siendo el total del período
  (desde/hasta), no el del filtro. Si lo atara al filtro, dejaría de cuadrar con
  la suma de las tarjetas.
- Lista canónica duplicada backend/frontend (el backend y el frontend se
  deployan separados, no hay paquete compartido). Mismo patrón que el mensaje de
  lumix: comentario que manda a mantener las dos copias en sync.

## Constraints

- Migración idempotente, mismo patrón que `fecha_agotado` / `nombre_factura`:
  `init.sql` (CREATE + ALTER) **y** `migrate.js` (corre en cada boot, incluido
  cold start de Vercel).
- El filtro por categoría se aplica en SQL, no en el cliente: la paginación
  depende del total filtrado.
- Reutilizar el patrón de la casa: `<select>` de `LiquidezModal`, badge de
  `LiquidezClient` (`inline-flex ... rounded-full`).
- TDD: OFF (no hay test runner en `frontend/package.json` ni en
  `backend/package.json`). Checks aplicables: `npm run build` en `frontend/` y
  `node --check` sobre los archivos backend tocados.

## Tasks

- [ ] T1 — Schema + migración: columna `categoria VARCHAR(20)` nullable en
      `gastos` (init.sql CREATE TABLE + ALTER idempotente) y CHECK constraint
      sobre el dominio de 3 slugs en migrate.js.
- [ ] T2 — `store.js`: `add` y `update` persisten `categoria`; `list` la devuelve
      en el SELECT, acepta `categoria` como filtro, y calcula los totales por
      categoría en el rango de fechas.
- [ ] T3 — `controller.js` + `network.js`: pasan `categoria` en el body del
      POST/PUT y en el query del GET.
- [ ] T4 — `api.ts`: `Gasto.categoria`, `GastosResponse.totalesPorCategoria`,
      `createGasto`/`updateGasto` aceptan la categoría, `listGastos` la envía,
      y la lista canónica de categorías como const tipada.
- [ ] T5 — `GastoModal.tsx`: `<select>` de categoría, precargado al editar.
- [ ] T6 — `GastosClient.tsx`: tarjetas de totales por categoría, dropdown de
      filtro junto al filtro de fechas, columna + badge en la tabla, `colSpan` y
      limpieza de selección al cambiar el filtro.

## Authorized scope

Implementación completa del cambio descripto. Sin push ni PR: el commit de cierre
lo decide el usuario.

## Out of scope (hallazgo, RESUELTO en commit aparte)

`network.js` declaraba `router.delete("/gastos")` sin `:id`, pero
`removeCajaGastos` lee `req.params.id` — siempre `undefined`, así que el borrado
de gastos estaba roto desde antes de este feature. Bug preexistente, no lo
introdujo este cambio. **Corregido a pedido explícito del usuario** (2026-09-27),
fuera de este feature: la ruta pasó a `router.delete("/gastos/:id", ...)`,
igual que `liberacion-plata` y `deudores`.

Pendiente de decidir: el endpoint sigue sin ser llamado por el frontend — no
existe `deleteGasto` en `api.ts` ni botón de borrado en `GastosClient`. Gastos es
la ÚNICA sección de la app sin delete en la UI, y por eso la ruta rota nunca dio
señal.

→ **Resuelto el 2026-09-27** (el usuario pidió el botón): ver "Botón de eliminar
en la UI" en la sección Progress.

## Acceptance criteria

- Crear un gasto con categoría "Emprendimiento": queda guardado y aparece con su
  badge en la tabla.
- El total de cada categoría refleja el rango de fechas activo, no la página
  visible.
- Filtrar por "Servicios" lista solo gastos de servicios y la tarjeta activa se
  resalta; la paginación sigue siendo correcta (el total filtrado manda).
- Un gasto legacy sin categoría se muestra como "Sin categoría" y suma su
  total en su propia tarjeta.
- Editar un gasto legacy y elegir categoría la deja clasificada.
- `npm run build` (frontend) y `node --check` (backend) pasan.

## Progress

**Estado:** COMPLETADO (2026-09-27). **TDD:** OFF (fuente: ausencia de runner en
`frontend/package.json` y `backend/package.json`; checks aplicables =
`npm run build` + `node --check`).
**Delivery:** 8 archivos, 238 líneas cambiadas (excluye el ruido de `.atl/`).
Estrategia `ask-on-risk`; muy por debajo del presupuesto de ~400 → sin chaining.
Commit y push: decisión del usuario.

- [x] T1
- [x] T2
- [x] T3
- [x] T4
- [x] T5
- [x] T6

**Verificación observada:**

- Writer: `npm run build` (frontend) → `13 page(s) built / Complete!`;
  `node --check` × 4 backend → exit 0.
- Padre (spot check, re-corrido tras la corrección): `npm run build` →
  `13 page(s) built in 5.07s / Complete!`; `node --check` × 4 → exit 0.
- Padre (readback estructural del diff completo, 8 archivos): coincide con el
  diseño. Verificadas las clases Tailwind contra `tailwind.config.mjs`
  (`gap-gutter`, `p-stack_lg`, `text-display-lg`, `text-body-sm` existen; los
  colores raw coinciden con el idioma de `LiquidezClient` y no los borra el
  `extend`).
- `gentle-ai review assess`: **medium**, única razón `.atl/.skill-registry.cache.json`
  (auto-refresh del entorno, NO parte del feature; excluido del commit).
  RDD `off` (decided by default) → sin review nativo ni consentimiento.
  Tier medium + modelo default → auto-verificación del writer suficiente.

**Corrección del padre (T2):** `store.js` calculaba el `totalMonto` del
encabezado con `where`, que incluye el filtro de categoría — contradiciendo la
decisión de diseño de que ese número es el total del PERÍODO. Efecto colateral
silencioso: antes del feature `where` era solo el rango de fechas, así que la
línea era correcta y agregar la categoría le cambió el significado. Con filtro
activo el número grande dejaba de cuadrar con la suma de las tarjetas. Corregido
a `whereFechas`; el `COUNT` sigue usando `where` a propósito (la paginación
depende del total filtrado).

**Corrección aceptada del writer (T2):** reemplazó el ternario de `where`
(original: `conds[0] AND conds[1]`, que con 3 condiciones descartaba en silencio
la tercera) por un reduce `andWhere` que encadena N condiciones. Verificado: con
3 condiciones produce `(c0 AND c1) AND c2`. Necesario, no scope creep — el
feature hace alcanzables 3 condiciones.

**Corrección aceptada del writer (T6):** el resaltado de la tarjeta activa usa
`ring-2 ring-secondary` en vez de `border-secondary`, porque dos utilidades de
`border-color` compiten en la misma propiedad y se resuelven por orden de emisión
de Tailwind, no por orden en el `className`.

**NO verificado en runtime:** el SQL nunca se ejecutó contra una base real. No
hay Docker corriendo ni Postgres local, y `backend/.env` apunta a la NeonDB de
producción, contra la cual no se corrieron migraciones (DDL en base viva =
decisión del usuario). La corrección del `totalMonto` está verificada por
lectura, no por ejecución.

**Hallazgo preexistente, no corregido (out of scope):** `network.js` declara
`router.delete("/gastos")` sin `:id` mientras el controller lee
`req.params.id` — el borrado de gastos está roto desde antes de este feature.

**Fix del delete (2026-09-27, a pedido del usuario):** `network.js` ahora declara
`router.delete("/gastos/:id", [verifyToken], removeCajaGastos)`. Verificado:
`node --check` exit 0. El resto de la cadena ya funcionaba — el controller
pasa `req.params.id` al store y el store hace `DELETE FROM gastos WHERE id =
${id}`.

**Botón de eliminar en la UI (2026-09-27, a pedido del usuario):** el endpoint
no tenía NINGÚN llamador — no existía `deleteGasto` en `api.ts` ni botón en
`GastosClient`, y gastos era la única sección de la app sin delete. Agregado:
- `deleteGasto(id)` en `api.ts` → `DELETE /gastos/${id}` (id en el path, igual
  que `deleteDeudor` / `deleteLiberacion`).
- `handleDelete` en `GastosClient` con `window.confirm` nombrando descripción y
  monto (no un "¿eliminar?" genérico), guard `busy = deletingId !== null` para
  evitar doble click con dos DELETE al mismo id, y limpieza del id en
  `selectedIds` para que la barra de seleccionadas no cuente un gasto que ya
  no existe.
- Patrón de botón copiado de `LiberacionPlataClient` (ícono `delete`,
  `hover:text-error hover:bg-error/5`, `disabled:opacity-40`).

Dos detalles que la app no tenía resueltos en ningún lado y que hubo que
resolver acá:

1. **Edge case de paginación.** Si el único gasto de la última página se borra,
   el refetch deja `currentPage` apuntando más allá del final: tabla vacía con
   `total > 0` y una página que ya no existe. `handleDelete` retrocede un paso
   ANTES de refetchear cuando `items.length === 1 && currentPage > 1`.
2. **Error que nunca se limpia.** `error` reemplaza toda la tabla en el render y
   `load()` solo lo seteaba en el `.catch` — un error viejo dejaba la vista
   vacía para siempre aunque las consultas volvieran a funcionar. Agregado
   `setError('')` al arranque de `load()`. Sin esto, un borrado fallido te
   dejaba la tabla en blanco de forma permanente. **El mismo bug existe hoy en
   `DeudoresClient` y `LiquidezClient`** (mismo patrón de render) — NO se
   tocaron, quedan como seguimiento.
