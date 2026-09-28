# Limpieza de errores de TypeScript (tsc --noEmit en rojo)

**Objective:** Dejar `npx tsc --noEmit` en 0 errores dentro de `frontend/`, sin
cambiar comportamiento observable en ninguna pantalla.

**Problem:** El typecheck del frontend reporta **179 errores** y hace months que
nadie lo mira porque `npm run build` (Astro) es más permisivo y pasa igual. Son
seis problemas distintos, no uno:

| # | Ubicación | Código | Cantidad | Naturaleza |
|---|---|---|---|---|
| 1 | `CalculadoraClient.tsx`, `CalculadoraBasica.tsx` | TS2322 | 174 | `class=` en vez de `className=` en JSX |
| 2 | `CalculadoraClient.tsx:174` | TS7006 | 1 | `prev` implicitly `any` en `setNextId` |
| 3 | `lib/lumix.ts:206` | TS7006 | 1 | `ph` implicitly `any` (placeholder SQL) |
| 4 | `lib/api.ts:1,27` | TS2339 | 2 | `Property 'env' does not exist on type 'ImportMeta'` |
| 5 | `FlujoFondosClient.tsx:516` | TS2345 | 1 | `number \| undefined` pasado a parámetro `number` |

**Why:** Pedido explícito del usuario tras detectar los errores durante el trabajo
de los popovers de Rotación. Deuda técnica real: sin typecheck limpio no hay
ninguna barrera que detecte una regresión de tipos antes de que llegue a
producción.

## Scope

- Solo `frontend/`. NO se toca el backend.
- Solo corregir tipos. Ningún cambio de lógica, de UI copy, de cálculos ni de
  comportamiento en runtime.
- T5 puede revelar un bug real de runtime: si se encuentra, se corrige con el
  guard mínimo que preserve el comportamiento correcto y se documenta.

## Constraints

- **`class=` → `className=` no cambia la UI.** React 19 pasa atributos
  desconocidos al DOM tal cual, así que hoy `class="..."` SÍ se aplica: la
  calculadora se ve bien. Este cambio es type-safety, no un fix visual. No
  prometer "arreglé algo que se veía roto" — no se veía roto.
- El replace debe ser quirúrgico: en esos dos archivos `class=` aparece también
  dentro de template literals (`` class={`...`} ``). Un replace de
  `className=` a `class=` o un regex ingenuo rompe el archivo.
- Nada de casts `as any` / `as unknown as` para silenciar errores. Si un tipo no
  se puede resolver, se corrige la declaración de origen.
- Comentarios de código en inglés (convención del repo).
- TDD: OFF (fuente: `sdd-init/cash-split`, `strict_tdd: false`, sin runner). El
  repo no tiene suite de tests. Checks aplicables: `npx tsc --noEmit` y
  `npm run build`.

## Tasks

- [x] T1 — `class=` → `className=` en `CalculadoraClient.tsx` y
      `CalculadoraBasica.tsx` (174 ocurrencias, TS2322). Cubrir las tres formas:
      `class="..."`, `` class={`...`} `` y `class={expr}`. Verificar que no se
      tocó ningún `className=` existente ni texto en strings.
- [x] T2 — `CalculadoraClient.tsx:174`: `setNextId(prev => prev + 1)` con `prev`
      implícitamente `any`. El estado nace de `JSON.parse` en un initializer de
      `useState`, así que el tipo sale de `JSON.parse` y no del valor. Tipar el
      estado en la declaración (`useState<number>(...)`) y validar que
      `JSON.parse` devuelve algo usable, no un estado corrupto en runtime.
- [x] T3 — `lib/lumix.ts:206`: el parámetro `ph` de un placeholder SQL sin tipo.
      Tipar según lo que realmente acepta la query (placeholder de valor, no de
      identificador).
- [x] T4 — `lib/api.ts:1,27`: `import.meta.env` no existe en `ImportMeta`.
      Falta la referencia de tipos de Astro (`astro/client`). Agregar el
      `env.d.ts` con `/// <reference types="astro/client" />` siguiendo la
      convención de Astro, NO ampliar el `tsconfig` a mano.
- [x] T5 — `FlujoFondosClient.tsx:516`: se pasa `number | undefined` a un
      parámetro `number`. **Investigar antes de tocar**: puede ser un
      `undefined` real que hoy produce `NaN` en la UI. Si es un dato que
      puede faltar de verdad, agregar el guard de dominio que corresponda, no
      un `!` ni un cast. Documentar qué se encontró.
- [x] T6 — Verificación final: `npx tsc --noEmit` con **0 errores** en todo
      `frontend/`, y `npm run build` exitoso.

## Authorized scope

Corrección de los seis problemas descriptos dentro de `frontend/`. Sin push: el
cierre lo decide el usuario.

## Acceptance criteria

- `npx tsc --noEmit` desde `frontend/`: 0 errores.
- `npm run build` desde `frontend/`: 13 páginas, exit 0.
- La calculadora se ve y funciona EXACTAMENTE igual que antes (mismo DOM
  renderizado: `class` vs `className` terminan como el mismo atributo HTML).
- Ningún `as any`, `as unknown as` ni `@ts-ignore` nuevo en el repo.
- Ningún archivo de `backend/` tocado.

## Progress

**Estado:** COMPLETADO (2026-09-28). **TDD:** OFF (fuente: sdd-init/cash-split;
runner: ninguno).

- [x] T1 · [x] T2 · [x] T3 · [x] T4 · [x] T5 · [x] T6

**Verificación observada:**

- **T1** — 174 ocurrencias convertidas (161 en `CalculadoraClient.tsx`, 13 en
  `CalculadoraBasica.tsx`), 0 restantes en ambos archivos. Replace estructural:
  el regex solo podía matchear `class=` seguido de `"`, `` ` `` o `{`, así que
  era incapaz de tocar cuerpos de template literals, `className` existentes,
  strings o comentarios. **Prueba:** reescribir el blob de HEAD con el mismo
  regex y byte-comparar contra el working copy dio IDÉNTICO en ambos archivos.
  Se preservaron los finales de línea de cada archivo (CRLF vs LF) y el
  encoding sin BOM. Diff: 174 inserciones / 174 eliminaciones.
  - **Corrección al supuesto del spec:** esto NO arreglaba nada visible. React
    19 pasa atributos desconocidos al DOM y HTML entiende `class`, así que la
    calculadora ya se veía bien. `className` renderiza al mismo atributo `class`:
    DOM byte-idéntico. Lo verificado empíricamente: React 19.2.6 produce HTML
    idéntico con `class` y con `className`. Lo único que se gana es que
    disappearon 174 warnings de `Invalid DOM property 'class'` por render en dev.
- **T2** — Causa real: `useState(() => JSON.parse(...))` infiere `S` como
  `any`, así que el updater pierde su tipo contextual. Corregido con
  `useState<number>(...)` + validación. **El tipo solo no alcanzaba:**
  `JSON.parse` NO tira con `"null"` ni `"{}"`, o sea un `nextId` guardado pero
  inválido sembraba un contador corrupto (`null + 1` → 1, o
  `"[object Object]1"`). Guard agregado: solo un `number` finito pasa; cualquier
  otra cosa vuelve a `1`. Happy path intacto.
- **T3** — **El diagnóstico del spec estaba mal y fue corregido.** No hay query
  SQL ni placeholder: `lib/lumix.ts` es un builder de template de mensaje de
  renovación de WhatsApp y `ph` es un match del regex tipo `{fecha}`. La causa
  real: `contenido`, 2º parámetro del replacer de `.replace()`, se
  contextualiza desde `...args: any[]`, degrada a `any`, y en cadena
  `contenido.match()` → `usados` → el callback de `.some()` quedan sin tipo.
  Anotados los parámetros del replacer como `string`. Un token, sin cambio de
  comportamiento. Tipar solo `ph` habría dejado el `any` de fondo.
- **T4** — `frontend/src/env.d.ts` con `/// <reference types="astro/client" />`.
  `tsconfig.json` sin tocar. Vía soportada por Astro. Nota: `PUBLIC_API_URL`
  queda como `any` por el index signature de Vite (comportamiento estándar);
  estrecharla a `string | undefined` es una mejora real pero fuera del scope de
  este spec.
- **T5** — **NO era un bug de runtime.** `undefined` no es alcanzable. La
  cadena: `ganancia_por_cobrar_total` es opcional y esa declaración es
  HONESTA, porque `TotalCaja` lo comparten dos proyecciones backend distintas
  (`dashboard/store.js` no selecciona esa columna, `flujoFondos/store.js` sí, con
  `COALESCE(SUM(...), 0)`). `flujoFondosData` se alimenta exclusivamente de
  `getFlujoFondos`, que siempre hace `Number(...)`, así que en la línea 516
  siempre es un `number` real y `0` significa "nada pendiente" — un cero VERDADERO,
  no una medición faltante. El patrón `null` + `—` de `RotacionClient` es para
  ratios no computables (`velocidad`, `roi`) y no aplica acá: agregar ese guard
  habría sido incorrecto. Fix: la convención que el propio archivo ya usa para
  campos opcionales, `Number(r.campo)` (presente en las líneas 492, 502, 503,
  597, 607, 608, incluido el `.sort()` sobre este mismo campo 13 líneas arriba).
  La línea 516 era el único lugar que mostraba un campo opcional sin envolverlo.
  No-op en runtime. Sin `!`, sin cast.
- **T6** — `npx tsc --noEmit` después de cada task: **179 → 5** (T1) **→ 4**
  (T2) **→ 4** (T3+T4) **→ 1** (T5) **→ 0**. Salida final vacía, exit 0.
  `npm run build` después de cada task: 13 páginas, exit 0.
  - Escape hatches (`as any` / `as unknown as` / `@ts-ignore`) en todo el
    frontend: **3 antes → 3 después**, sin aumento.
  - `backend/` sin tocar.
  - Spot check del padre: `npx tsc --noEmit` re-corrido → exit 0, salida vacía.
    Readback del diff de `FlujoFondosClient.tsx` y `lib/lumix.ts`: 1 token
    cada uno, exactamente lo reportado. `env.d.ts` verificado.

**Delivery:** 197 inserciones / 201 eliminaciones en 5 archivos + `env.d.ts` nuevo
(mayoría T1, un token por línea). Estrategia `ask-on-risk`: bajo 400, sin
chaining, un solo commit. Commit y push: decisión del usuario.
