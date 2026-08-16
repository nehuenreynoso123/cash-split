// Argentine number-format helpers shared by the calculadora section.
// Raw form: plain dot-decimal ("15000.5"). Display form: es-AR (thousands
// separators as dots, decimal as comma → "15.000,5").

export function toRaw(value: string): string {
  // Argentine format: dots = thousand separators (remove), commas = decimal (normalize to dot)
  const cleaned = value.replace(/[^\d.,]/g, '');
  const withoutDots = cleaned.replace(/\./g, '');
  return withoutDots.replace(/,/g, '.');
}

export function toDisplay(raw: string): string {
  if (!raw || raw === '.') return raw;
  const dotIndex = raw.indexOf('.');
  if (dotIndex === -1) {
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const intPart = raw.slice(0, dotIndex);
  const decPart = raw.slice(dotIndex + 1);
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
}
