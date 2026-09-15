import { useState } from 'react';
import type { Producto } from '../lib/api';

// Shared line shape for a sale form: one product row. SaleForm rows are plain
// SaleLine; EditVentaModal rows extend it with edit bookkeeping (the hook only
// ever touches the three shared fields).
export interface SaleLine {
  productId: string;
  cantidad: number;
  unitPriceInput: string;
}

export interface UseSaleLinesOptions<T extends SaleLine> {
  // Factory for a brand-new empty line (needed when T carries extra fields).
  newLine?: () => T;
  // Edit-mode only: extra stock a line may draw from a product on top of its
  // catalog stock. The sale still "holds" the line's ORIGINAL quantity for its
  // original product, so that product tolerates quantity edits up to
  // stock + original quantity without a false stock error. Receives the
  // selected product's id; defaults to 0 (create-mode semantics).
  heldQuantity?: (line: T, selectedProductId: number) => number;
}

export const emptySaleLine = (): SaleLine => ({
  productId: '',
  cantidad: 1,
  unitPriceInput: '',
});

// Shared per-line state + validation for the sale forms (SaleForm and
// EditVentaModal). Column name is `cantidad` everywhere to match the wire
// payload (product_id / cantidad / precio).
export function useSaleLines<T extends SaleLine = SaleLine>(
  initialLines: T[],
  products: Producto[],
  options: UseSaleLinesOptions<T> = {},
) {
  const [lines, setLines] = useState<T[]>(initialLines);

  const makeNewLine = options.newLine ?? (() => emptySaleLine() as unknown as T);

  const updateLine = (index: number, patch: Partial<T>) => {
    setLines((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addLine = () => setLines((prev) => [...prev, makeNewLine()]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const getSelected = (productId: string) => products.find((p) => p.id.toString() === productId);

  const getLineTotal = (line: T) => {
    const price = parseFloat(line.unitPriceInput) || 0;
    return price * line.cantidad;
  };

  const grandTotal = lines.reduce((sum, it) => sum + getLineTotal(it), 0);

  // Maximum quantity a line may hold for its selected product: catalog stock
  // plus whatever the sale still "holds" (edit mode).
  const getMaxStock = (line: T) => {
    const sel = getSelected(line.productId);
    if (!sel) return 0;
    return sel.stock + (options.heldQuantity?.(line, sel.id) ?? 0);
  };

  // stock error per line
  const getStockError = (line: T) => {
    const sel = getSelected(line.productId);
    if (!sel) return false;
    return line.cantidad > getMaxStock(line);
  };

  const hasStockError = lines.some(getStockError);

  // can submit?
  const canSubmit =
    lines.length > 0 &&
    lines.every((it) => it.productId && it.cantidad >= 1 && parseFloat(it.unitPriceInput) > 0) &&
    !hasStockError;

  return {
    lines,
    setLines,
    updateLine,
    addLine,
    removeLine,
    getSelected,
    getLineTotal,
    grandTotal,
    getMaxStock,
    getStockError,
    hasStockError,
    canSubmit,
  };
}