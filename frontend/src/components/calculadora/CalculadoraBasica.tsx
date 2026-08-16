import { useState, useMemo, useRef } from 'react';
import { toDisplay } from '../../lib/numFormat';

// ── Safe expression evaluator ──────────────────────────────────────────────
// Recursive descent parser for + - * / with parentheses, unary signs and
// standard precedence. Never uses eval(). Invalid expressions and division by
// zero return null / a structured error instead of throwing, so the UI can
// show a friendly message.

export type ErrorEvaluacion = 'sintaxis' | 'division-por-cero';

export type ResultadoEvaluacion = { valor: number } | { error: ErrorEvaluacion };

const DIVISION_POR_CERO = Symbol('division-por-cero');

export function evaluarExpresionConError(expresion: string): ResultadoEvaluacion {
  // Normalize the displayed es-AR notation into the canonical form the parser
  // understands: − → -, × → *, ÷ → /, decimal comma → dot, drop whitespace.
  const expr = expresion
    .replace(/\u2212/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
  if (expr === '') return { error: 'sintaxis' };

  let pos = 0;
  const peek = (ch: string) => expr[pos] === ch;
  const next = () => expr[pos++];

  const parseSuma = (): number => {
    let valor = parseProducto();
    while (peek('+') || peek('-')) {
      const op = next();
      const derecho = parseProducto();
      if (op === '+') valor += derecho;
      else valor -= derecho;
    }
    return valor;
  };

  const parseProducto = (): number => {
    let valor = parseFactor();
    while (peek('*') || peek('/')) {
      const op = next();
      const derecho = parseFactor();
      if (op === '*') valor *= derecho;
      else {
        if (derecho === 0) throw DIVISION_POR_CERO;
        valor /= derecho;
      }
    }
    return valor;
  };

  const parseFactor = (): number => {
    if (peek('+') || peek('-')) {
      const signo = next() === '-' ? -1 : 1;
      return signo * parseFactor();
    }
    if (peek('(')) {
      next();
      const interno = parseSuma();
      if (!peek(')')) throw new Error('sintaxis');
      next();
      return interno;
    }
    const numero = /^\d*\.?\d+/.exec(expr.slice(pos));
    if (!numero) throw new Error('sintaxis');
    pos += numero[0].length;
    return parseFloat(numero[0]);
  };

  try {
    const valor = parseSuma();
    if (pos !== expr.length) return { error: 'sintaxis' };
    if (!Number.isFinite(valor)) return { error: 'sintaxis' };
    return { valor };
  } catch (e) {
    if (e === DIVISION_POR_CERO) return { error: 'division-por-cero' };
    return { error: 'sintaxis' };
  }
}

// True while the user is still typing a number or sub-expression (trailing
// operator, trailing decimal separator or an open parenthesis), so the UI can
// avoid flashing an error mid-edit. Pressing "=" still surfaces the real error.
function expresionIncompleta(expresion: string): boolean {
  if (!expresion) return true;
  if (/[+\-−×÷(]$/.test(expresion)) return true;
  if (/,$/.test(expresion)) return true;
  const abiertas = (expresion.match(/\(/g) || []).length;
  const cerradas = (expresion.match(/\)/g) || []).length;
  return abiertas > cerradas;
}

// Format the evaluated number in es-AR (thousands dots, decimal comma),
// rounding away floating point noise (0,1 + 0,2 → 0,3). Very large results
// that would leak scientific notation ("1e+21") fall back to the browser's
// es-AR locale formatting instead.
function formatearResultado(valor: number): string {
  if (Math.abs(valor) >= 1e15) {
    return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }
  const redondeado = Math.round(valor * 1e10) / 1e10;
  return toDisplay(String(redondeado)).replace(/-/g, '−');
}

type Tecla = {
  etiqueta: string;
  esIcono?: boolean;
  inserta?: string;
  accion?: 'limpiar' | 'borrar' | 'calcular';
  ariaLabel?: string;
  resaltada?: boolean;
};

const TECLAS: Tecla[] = [
  { etiqueta: 'C', accion: 'limpiar', ariaLabel: 'Limpiar todo' },
  { etiqueta: '(', inserta: '(', ariaLabel: 'Abrir paréntesis' },
  { etiqueta: ')', inserta: ')', ariaLabel: 'Cerrar paréntesis' },
  { etiqueta: 'backspace', esIcono: true, accion: 'borrar', ariaLabel: 'Borrar último carácter' },
  { etiqueta: '7', inserta: '7' },
  { etiqueta: '8', inserta: '8' },
  { etiqueta: '9', inserta: '9' },
  { etiqueta: '÷', inserta: '÷', ariaLabel: 'Dividir' },
  { etiqueta: '4', inserta: '4' },
  { etiqueta: '5', inserta: '5' },
  { etiqueta: '6', inserta: '6' },
  { etiqueta: '×', inserta: '×', ariaLabel: 'Multiplicar' },
  { etiqueta: '1', inserta: '1' },
  { etiqueta: '2', inserta: '2' },
  { etiqueta: '3', inserta: '3' },
  { etiqueta: '−', inserta: '−', ariaLabel: 'Restar' },
  { etiqueta: '0', inserta: '0' },
  { etiqueta: ',', inserta: ',', ariaLabel: 'Separador decimal' },
  { etiqueta: '+', inserta: '+', ariaLabel: 'Sumar' },
  { etiqueta: '=', accion: 'calcular', resaltada: true, ariaLabel: 'Calcular resultado' },
];

export default function CalculadoraBasica() {
  const [expresion, setExpresion] = useState('');
  const [evaluarForzado, setEvaluarForzado] = useState(false);
  const entradaRef = useRef<HTMLInputElement>(null);

  // Live evaluation: the result line shows the current value while typing and
  // the friendly error message when the expression is complete and invalid.
  const { resultado, error } = useMemo(() => {
    if (!expresion) return { resultado: null, error: null };
    const res = evaluarExpresionConError(expresion);
    if ('valor' in res) {
      return { resultado: formatearResultado(res.valor), error: null };
    }
    if (!evaluarForzado && expresionIncompleta(expresion)) {
      return { resultado: null, error: null };
    }
    return {
      resultado: null,
      error: res.error === 'division-por-cero' ? 'No se puede dividir por cero' : 'Expresión inválida',
    };
  }, [expresion, evaluarForzado]);

  const editar = (actualizacion: (prev: string) => string) => {
    setEvaluarForzado(false);
    setExpresion(actualizacion);
  };

  const calcular = () => setEvaluarForzado(true);

  const pulsarTecla = (t: Tecla) => {
    if (t.accion === 'limpiar') editar(() => '');
    else if (t.accion === 'borrar') editar((prev) => prev.slice(0, -1));
    else if (t.accion === 'calcular') calcular();
    else editar((prev) => prev + (t.inserta ?? t.etiqueta));
    // Keep keyboard focus on the display so Enter/digits keep working after
    // clicking the keypad (avoids re-triggering the last pressed button).
    entradaRef.current?.focus();
  };

  const manejarTeclado = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Physical keyboard input maps onto the displayed es-AR symbols.
    const mapa: Record<string, string> = { '.': ',', '*': '×', '/': '÷', '-': '−' };
    if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      calcular();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      editar((prev) => prev.slice(0, -1));
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      editar(() => '');
      return;
    }
    const inserta = mapa[e.key] ?? e.key;
    if (/^[\d,()+\-−×÷.]$/.test(inserta)) {
      e.preventDefault();
      editar((prev) => prev + inserta);
    }
  };

  return (
    <div
      class="w-full xl:w-96 shrink-0 bg-surface-container rounded-2xl p-4 flex flex-col gap-4"
      role="group"
      aria-label="Calculadora básica"
      onKeyDown={manejarTeclado}
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-xl text-secondary">calculate</span>
        <h3 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Calculadora</h3>
      </div>

      <div class="rounded-xl bg-surface-container-lowest border border-outline p-4 flex flex-col gap-2">
        <input
          ref={entradaRef}
          readOnly
          value={expresion}
          placeholder="0"
          aria-label="Expresión de la calculadora"
          class="w-full bg-transparent text-right font-data-mono text-data-mono text-on-surface outline-none placeholder:text-on-surface-variant/50"
        />
        <div class="min-h-7 flex items-center justify-end">
          {error ? (
            <p class="font-body-sm text-error text-right">{error}</p>
          ) : resultado ? (
            <p class="font-data-mono text-xl font-bold text-on-surface text-right break-all leading-tight">{resultado}</p>
          ) : (
            <p class="font-body-sm text-on-surface-variant/50">—</p>
          )}
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        {TECLAS.map((t) => (
          <button
            key={t.esIcono ? `${t.etiqueta}-icon` : t.etiqueta}
            type="button"
            aria-label={t.ariaLabel}
            onClick={() => pulsarTecla(t)}
            class={`h-12 rounded-xl font-data-mono text-lg transition-all duration-200 active:scale-[0.98] ${
              t.resaltada
                ? 'bg-secondary text-on-secondary hover:bg-secondary/90'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {t.esIcono ? (
              <span class="material-symbols-outlined text-2xl leading-none">{t.etiqueta}</span>
            ) : (
              t.etiqueta
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
