import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface HelpTooltipProps {
  text: string;
  label?: string;
}

// Distance between the trigger and the panel, and the padding kept from the
// viewport edges so the panel never leaves the window either.
const GAP = 8;
const VIEWPORT_MARGIN = 8;
// Mirrors the panel's `w-56`. Only used to center the panel on the very first
// measurement, before the element has been laid out.
const PANEL_WIDTH = 224;

export default function HelpTooltip({ text, label = 'Qué significa esta columna' }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  // The panel stays hidden until its position is computed, so it is never
  // painted at a stale coordinate.
  const [posicion, setPosicion] = useState<{ left: number; top: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  // A pointer press focuses the button *before* `click` fires, so reacting to
  // both focus and click naively would open the panel and close it again within
  // the same gesture. This flag hands the toggle over to `click` for pointer
  // input and leaves `focus` to handle keyboard navigation.
  const pointerGesture = useRef(false);

  const cerrar = useCallback(() => {
    setOpen(false);
    setPosicion(null);
  }, []);

  useEffect(() => {
    if (!open) {
      setPosicion(null);
      return;
    }

    const medir = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panel = panelRef.current;
      const width = panel?.offsetWidth ?? PANEL_WIDTH;
      const height = panel?.offsetHeight ?? 0;

      // Prefer below the trigger, flip above it when there is no room below.
      let top = rect.bottom + GAP;
      if (height > 0 && top + height > window.innerHeight - VIEWPORT_MARGIN) {
        const above = rect.top - GAP - height;
        if (above >= VIEWPORT_MARGIN) top = above;
      }
      if (height > 0) {
        top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - height - VIEWPORT_MARGIN));
      }
      // Center on the trigger, then clamp so a panel close to either edge of the
      // window stays fully readable.
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - VIEWPORT_MARGIN),
      );
      setPosicion({ left, top });
    };

    medir();
    // Capture phase: the table lives inside its own horizontal scroll container,
    // and that scroll does not bubble to the window, so the panel would keep a
    // stale position if only the non-capturing window listener were used.
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) cerrar();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, cerrar]);

  return (
    <div
      ref={wrapperRef}
      className="inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={cerrar}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onPointerDown={() => {
          pointerGesture.current = true;
        }}
        onFocus={() => {
          if (pointerGesture.current) {
            pointerGesture.current = false;
            return;
          }
          setOpen(true);
        }}
        onBlur={cerrar}
        onClick={() => {
          pointerGesture.current = false;
          setOpen((prev) => !prev);
        }}
        className="flex items-center rounded-full text-on-surface-variant/60 hover:text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1"
      >
        <span className="material-symbols-outlined text-base leading-none">info</span>
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="tooltip"
          style={{
            left: posicion?.left ?? 0,
            top: posicion?.top ?? 0,
            visibility: posicion ? 'visible' : 'hidden',
          }}
          className="fixed z-50 w-56 whitespace-normal normal-case rounded-xl bg-inverse-surface text-inverse-on-surface text-body-sm px-4 py-3 shadow-lg"
        >
          {text}
        </div>
      )}
    </div>
  );
}
