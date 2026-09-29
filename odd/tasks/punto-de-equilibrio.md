# Punto de equilibrio + simulador de escala

**Objective:** Sección nueva `/punto-de-equilibrio` que, con datos reales del
negocio, responde dos preguntas: **cuánta plata hay que facturar para que el
negocio no dé pérdida** y **cuánta para además cubrir los gastos personales**.
Incluye un simulador "¿qué pasa si vendo más?" que separa costos fijos de
variables.

**Problem:** El usuario factura ~2.300.000, gasta ~1.230.000 en el
emprendimiento y ~1.000.000 a nivel personal. Le quedan ~70.000: el 3% de lo
que factura. Su diagnóstico textual es *"si aumento las ventas también voy a
tener más gastos"*, y tiene razón, pero no hay forma de saberlo: hay gastos que sí
crecen con la venta (envío, comisión, impuestos, materiales) y gastos que no se
mueven (alquiler, monotributo, internet). Sin esa separación no hay decisión
posible: no sabe si vender el doble lo hace más rico o sólo más ocupado.

**Why:** Pedido explícito — "podemos armar una funcionalidad en base a
estrategias que usan las empresas para escalar el negocio". Confirmó el alcance
en la pregunta de opción: **Punto de equilibrio + simulador** (no sólo
clasificar gastos, no un plan de metas).

## El concepto que implementa

**Margen de contribución** = Ingresos − Costos variables.
**Tasa de contribución** = Margen de contribución / Ingresos.

Es lo que cada peso de venta deja *antes* de pagar los gastos fijos. Si la tasa
es alta, vender más vale. Si es baja o negativa, vender más NO salva: hay que
cambiar el margen.

- `Equilibrio del negocio = Gastos fijos de negocio / Tasa de contribución`
- `Equilibrio personal = (Gastos fijos de negocio + Gastos personales) / Tasa`

Con los números del usuario el resultado NO es el que este documento anticipaba.
Al verificar `calcularModelo` con los valores reales (T7) salió que el margen de
contribución es **negativo**: el costo de mercadería congelado más el costo
operativo de Facturación ya superan lo facturado, antes de tocar un solo peso de
gastos. O sea: **no existe punto de equilibrio** y la pantalla lo declara.

Esto NO es un bug del cálculo, es exactamente el caso que el guard clause de
`equilibrioNoAlcanzable` existe para mostrar. La conclusión contable sigue siendo
la del planteo —el reparto fijo/variable cambia el resultado por casi un millón
de pesos— pero el número de equilibrio que importa no es "cuánto facturo", sino
**cuánto margen por venta**: con la tasa actual, vender más te aleja. La palanca
es el margen, no el volumen.

## Hallazgos de exploración (previos a implementar)

1. `ventas.ganancia = precio − (productos.precio × cantidad)`, y `ventas.precio`
   es el **total de la línea**, no el precio unitario
   (`backend/.../ventas/store.js:11-12` y `:56-57`).
2. El costo de mercadería **ya está congelado venta por venta**:
   `costo = SUM(v.precio − v.ganancia)`, el mismo criterio que usa
   `flujoFondos/store.js:32`.
3. `ventas_facturacion` ya guarda el costo operativo **por venta**:
   `comision_venta`, `comision_cuota`, `envio_ml`, `envio_flex`, `descuento`,
   `retenciones`. **No hay que pedirle nada nuevo al usuario.**
4. `gastos` sólo tiene `categoria` (personal/emprendimiento/servicios). **No
   puede expresar fijo vs variable** → es el único dato que falta, y por eso la
   migración de T1 es el prerrequisito de todo lo demás.
5. `ventas` se filtra por `created_at` en Flujo de Fondos
   (`flujoFondos/store.js:9-10`), no por `fecha_cobro`. Se replica esa
   semántica para que las dos secciones no se contradigan.
6. `flujoFondos` joins `productos`; el agregado de costo de mercadería **no
   necesita ese join** (usar `v.precio − v.ganancia`), así que la query nueva
   no arrastra la degradación de performance del LEFT JOIN sobre `productos`.
7. `ventas.ganancia` es `NOT NULL DEFAULT 0` en el esquema, pero
   `flujoFondos` lo trata como nullable defensivamente. Se replica ese COALESCE.
8. **No hay test runner en el repo.** `backend/package.json` tiene
   `"test": "echo \"Error: no test specified\" && exit 1"`; `frontend/` no tiene
   script de test. No hay vitest/jest ni archivos `*.test.*`.
   → **TDD desactivado (no hay runner).** Checks aplicables:
   `npx tsc --noEmit` (baseline: 0 errores) y `npm run build` en `frontend/`.
   No se inventa un runner ni un command de TDD que no existe.

## Riesgo de doble conteo (declarado, no escondido)

La mercadería se cuenta **una sola vez**: sale de `ventas` (costo congelado). Los
gastos variables de `gastos` se suman aparte, como observados. Pero si el
usuario tiene el mismo envío cargado **dos veces** (una en Facturación y otra en
Gastos), la app lo suma dos veces. Por eso T5 muestra el desglose completo de
cada fuente en pantalla, y el simulador parte de los números tal cual: la app
muestra la verdad de lo que está cargado, no la corrige sola.

## Scope

- Backend: `gastos.tipo` (fijo|variable|NULL) + garantía de dominio; campo `tipo`
  en `add`/`update`/`list` de gastos; componente `puntoEquilibrio` con
  `GET /punto-equilibrio?desde&hasta`; registro en `routes.js`.
- Frontend: tipos + `getPuntoEquilibrio()` en `api.ts`; página
  `punto-equilibrio.astro`; `PuntoEquilibrioClient` con tarjetas, la regla de
  equilibrio y el simulador; entry en `Sidebar`; `<select>` de tipo en
  `GastoModal` + badge en la tabla de gastos.
- NO toca: dashboard, flujo de fondos, calculadora, lumix, liberacion-plata.
  `gastos` sólo suma una columna nueva; los consumidores que leen
  `SELECT id, descripcion, monto, categoria, fecha` siguen funcionando.

## Decisiones de cálculo (fijadas antes de codear)

- **Base de ingresos**: `SUM(ventas.precio)`. Es el registro completo — toda
  venta toca stock. `ventas_facturacion` puede estar parcial.
- **Costo operativo como tasa, no como monto**: la app calcula
  `tasaOperativa = costoOperativoFacturacion / ingresosFacturacion` y la aplica
  a los ingresos del período. Así una facturación parcial no subestima el costo
  de toda la venta. Si no hay facturación en el período, la tasa es 0 y se
  levanta la bandera `sinDatosFacturacion` para que la UI lo diga.
- **Gastos personales son fijos** respecto de las ventas: no se tocan con el
  volumen. Son el segundo umbral, no un costo variable.
- **Guard clauses obligatorias**:
  - `tasaContribucion <= 0` → **no existe punto de equilibrio** (vender más
    empeora). Se devuelve `equilibrioAlcanzable: false` y la UI lo dice con
    todas las letras. Nunca `Infinity` ni `NaN` en el payload.
  - `ingresos === 0` → modelo vacío, sin divisiones.
  - `sinTipoNegocio > 0` → `gastosClasificados: false` + aviso. El equilibrio
    con gastos sin clasificar subestima el negocio; la app lo declara.
  - `u === 0` con ingresos > 0 (caso patológico) → `precioUnitarioMedio` es
    `null` y el equilibrium en unidades se omite.

## TDD mode

**Off.** No hay runner de tests en el repo (ver hallazgo 8). Checks aplicables:
`npx tsc --noEmit` en `frontend/` y `npm run build`. Los cálculos del modelo se
verifican con casos a mano contra las cifras del usuario y quedan documentados
en la sección de verificación.

## Riesgo de tamaño

Pronóstico ~600 líneas authored (más de las ~400 heurísticas). Es lo que exige
el alcance —el simulador y su aritmética son el producto—, así que se sigue sin
partir artificialmente. El comportamiento de los totales por categoría que ya
existen **no cambia**: `tipo` es una columna aditiva.

## Tareas

- [x] T1 — Migración `gastos.tipo` + `gastos_tipo_check` en `migrate.js` e `init.sql`
- [x] T2 — Backend `puntoEquilibrio`: store + controller + network + `routes.js`
- [x] T3 — `api.ts`: tipos del modelo, `getPuntoEquilibrio()`, `tipo` en el payload de gastos
- [x] T4 — `gastos/store.js`: `tipo` en `add`/`update`/`list` + totales por tipo
- [x] T5 — Página `punto-equilibrio.astro` + `PuntoEquilibrioClient` + `Sidebar`
- [x] T6 — `GastoModal` campo tipo + badge en `GastosClient`
- [x] T7 — Verificación: `tsc --noEmit`, `build`, aritmética a mano
- [ ] T8 — Verificación contra la base real (levantar Postgres + `GET /punto-equilibrio`
      autenticado). **Pendiente**: Docker no está corriendo en esta máquina.

## Progreso

- T1–T6 escritos. La sesión anterior cortó antes de verificar y commitear.
- Al retomar: `tsc --noEmit` daba **5 errores** (arrastrados de la sesión anterior,
  no introducidos por T7). Corregidos en la raíz, no con casts:
  1. `TIPOS_GASTO` estaba tipado como `CategoriaGastoInfo[]` pero sus valores son
     `'fijo' | 'variable'`. Se creó una `OpcionInfo<T extends string>` genérica y
  `CategoriaGastoInfo = OpcionInfo<CategoriaGasto>`; así los dos dominios
     comparten forma sin mentirle al compilador. Arregló 3 errores de una.
  2. `LineaProps.signo` no incluía `'?'`, que la pantalla usa para marcar gastos
     sin categoría (no son una resta: son un dato incompleto declarado).
- Copy de la pantalla revisado: estaba escrito en Spanglish ("divided by la
  tasa", "el negocio survives", "seSacan"). Corregido a español neutro.

## Verificación

| Check | Resultado |
| --- | --- |
| `npx tsc --noEmit` (frontend/) | **0 errores** (los 5 arrastrados corregidos) |
| `npm run build` (frontend/) | **OK** — 14 páginas, incluye `/punto-equilibrio/index.html` |
| `calcularModelo` — 5 casos | Ver abajo |
| Base real / endpoint autenticado | **NO VERIFICADO** — sin Postgres (Docker apagado) |

Casos ejecutados contra la función pura (sin base, con `ventas` y `operativos`
de ejemplo y `gastos` variando):

- **A — 900.000 variables + 330.000 fijos**: tasa de contribución **−9,1%** →
  `equilibrioAlcanzable: false`, ambos equilibrios `null`. Aviso
  `equilibrioNoAlcanzable: true`.
- **B — 1.100.000 variables + 130.000 fijos**: tasa **−26,5%** → igual, `null`.
  El reparto fijo/variable mueve el resultado en ~970.000, como se anticipaba.
- **C — todo el negocio sin tipo**: equilibrio del negocio `0` (fijos = 0) y
  personal `5.000.000`, con `gastosClasificados: false`. Confirma que la UI
  tiene que advertir subestimación, no devolver un número limpio.
- **D — contribución negativa explícita**: equilibrios `null`, sin excepción.
- **E — período vacío**: ingresos 0, tasa 0, equilibrios `null`,
  `unidadesEquilibrioNegocio: null`. Payload serializa a JSON válido, **sin
  `NaN` ni `Infinity`** en ningún caso.

Lo que falta es lo único que no se puede simular: leer los números reales de la
base y verlos en pantalla. Eso es T8.

