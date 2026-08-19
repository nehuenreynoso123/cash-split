import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { todayISO } from '../../lib/data';
import type { Venta, VentaFormItem } from './ventas';

interface AgregarVentaFormProps {
  onAddVenta: (
    draft: Omit<Venta, 'id' | 'nroFactura' | 'importe'>,
    items?: VentaFormItem[],
  ) => Promise<void>;
  productosExistentes: string[];
  nombresExistentes: string[];
}

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date' | 'url';
  money?: boolean;
  min?: number;
  step?: string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  onCopy?: () => void;
  copied?: boolean;
}

function CopyButton({ copied, onClick, label }: { copied: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copiar ${label}`}
      className="inline-flex items-center gap-1 h-7 px-2 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-xs font-medium transition-all"
    >
      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
      {copied ? '¡Copiado!' : 'Copiar'}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  money = false,
  min,
  step,
  required,
  placeholder,
  helper,
  onCopy,
  copied = false,
}: FieldProps) {
  const inputClass = [
    'w-full h-12 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all',
    money ? 'pl-8 pr-4 font-data-mono' : 'px-4',
  ].join(' ');

  const input = (
    <input
      type={money ? 'number' : type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      step={step}
      placeholder={placeholder}
      required={required}
      className={inputClass}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="font-label-caps text-on-surface-variant uppercase">{label}</label>
        {onCopy && <CopyButton copied={copied} onClick={onCopy} label={label} />}
      </div>
      {money ? (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
          {input}
        </div>
      ) : (
        input
      )}
      {helper && <p className="text-on-surface-variant font-body-sm">{helper}</p>}
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 font-label-caps text-on-surface-variant uppercase tracking-wider">
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {children}
    </h4>
  );
}

const emptyFormItem = (): VentaFormItem => ({
  producto: '',
  cantidad: 1,
  precioVenta: '',
});

export default function AgregarVentaForm({
  onAddVenta,
  productosExistentes,
  nombresExistentes,
}: AgregarVentaFormProps) {
  // Shared sale fields
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState('');
  const [totalRecibido, setTotalRecibido] = useState('');
  const [link, setLink] = useState('');
  // Comisiones, envíos y descuentos
  const [comisionVenta, setComisionVenta] = useState('0');
  const [comisionCuota, setComisionCuota] = useState('0');
  const [envioML, setEnvioML] = useState('0');
  const [envioFlex, setEnvioFlex] = useState('0');
  const [descuento, setDescuento] = useState('0');
  const [retenciones, setRetenciones] = useState('0');
  // Datos de facturación
  const [fechaFactura, setFechaFactura] = useState('');
  const [dniCuit, setDniCuit] = useState('');
  const [nombreApellido, setNombreApellido] = useState('');
  const [nombreFactura, setNombreFactura] = useState('');
  // Jurisdicción
  const [codigoPostal, setCodigoPostal] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [provincia, setProvincia] = useState('');
  // Product items (dynamic rows)
  const [items, setItems] = useState<VentaFormItem[]>([emptyFormItem()]);
  // Autocomplete states
  const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);
  const [suggestionItemIdx, setSuggestionItemIdx] = useState<number>(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [nombreSuggestionsOpen, setNombreSuggestionsOpen] = useState(false);
  const [nombreActiveIndex, setNombreActiveIndex] = useState(-1);
  // Feedback
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyField = async (fieldKey: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField((current) => (current === fieldKey ? null : current)), 1500);
    } catch { /* Clipboard unavailable */ }
  };

  useEffect(() => {
    setFecha(todayISO());
    setFechaFactura(todayISO());
  }, []);

  const isPositive = (value: string) => {
    const n = parseFloat(value);
    return Number.isFinite(n) && n > 0;
  };

  // ── Product items helpers ─────────────────────────────────
  const updateItem = (index: number, patch: Partial<VentaFormItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyFormItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  // ── Product autocomplete per item ─────────────────────────
  const getProductQuery = (idx: number) => items[idx]?.producto.trim().toLowerCase() ?? '';
  const getProductMatches = (idx: number) => {
    const q = getProductQuery(idx);
    return q.length >= 3 ? productosExistentes.filter((p) => p.toLowerCase().includes(q)) : [];
  };

  const handleProductKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    const matches = getProductMatches(idx);
    if (e.key === 'Escape') {
      if (suggestionsOpen && suggestionItemIdx === idx) {
        e.preventDefault();
        setSuggestionsOpen(false);
        setActiveIndex(-1);
        setSuggestionItemIdx(-1);
      }
      return;
    }
    if (!suggestionsOpen || suggestionItemIdx !== idx || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < matches.length) {
        e.preventDefault();
        updateItem(idx, { producto: matches[activeIndex] });
        setActiveIndex(-1);
        setSuggestionsOpen(false);
        setSuggestionItemIdx(-1);
      }
    }
  };

  // Reset active index when product query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [items.map((it) => it.producto).join('|')]);

  // ── Nombre factura autocomplete ───────────────────────────
  const nombreQuery = nombreFactura.trim().toLowerCase();
  const nombreMatches = nombreQuery
    ? nombresExistentes.filter((n) => n.toLowerCase().includes(nombreQuery))
    : nombresExistentes;

  useEffect(() => {
    setNombreActiveIndex(-1);
  }, [nombreQuery]);

  const handleNombreKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (nombreSuggestionsOpen) {
        e.preventDefault();
        setNombreSuggestionsOpen(false);
        setNombreActiveIndex(-1);
      }
      return;
    }
    if (!nombreSuggestionsOpen || nombreMatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setNombreActiveIndex((i) => (i + 1) % nombreMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setNombreActiveIndex((i) => (i <= 0 ? nombreMatches.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (nombreActiveIndex >= 0 && nombreActiveIndex < nombreMatches.length) {
        e.preventDefault();
        setNombreFactura(nombreMatches[nombreActiveIndex]);
        setNombreActiveIndex(-1);
        setNombreSuggestionsOpen(false);
      }
    }
  };

  // ── Validation ────────────────────────────────────────────
  const allItemsValid = items.every(
    (it) => it.producto.trim() && it.cantidad >= 1 && isPositive(it.precioVenta),
  );

  const invalid =
    !fecha ||
    !fechaFactura ||
    !nombreApellido.trim() ||
    !nombreFactura.trim() ||
    !dniCuit.trim() ||
    !codigoPostal.trim() ||
    !localidad.trim() ||
    !provincia.trim() ||
    items.length === 0 ||
    !allItemsValid;

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    setSubmitting(true);
    try {
      const draft = {
        numero: numero.trim(),
        producto: items[0].producto.trim(),
        fecha,
        cantidad: items.reduce((sum, it) => sum + it.cantidad, 0),
        precioVenta: items.reduce((sum, it) => sum + (parseFloat(it.precioVenta) || 0) * it.cantidad, 0),
        comisionVenta: parseFloat(comisionVenta) || 0,
        comisionCuota: parseFloat(comisionCuota) || 0,
        envioML: parseFloat(envioML) || 0,
        envioFlex: parseFloat(envioFlex) || 0,
        descuento: parseFloat(descuento) || 0,
        retenciones: parseFloat(retenciones) || 0,
        totalRecibido: parseFloat(totalRecibido) || 0,
        fechaFactura,
        jurisdiccion: {
          codigoPostal: codigoPostal.trim(),
          localidad: localidad.trim(),
          provincia: provincia.trim(),
        },
        dniCuit: dniCuit.trim(),
        nombreApellido: nombreApellido.trim(),
        nombreFactura: nombreFactura.trim(),
        link: link.trim(),
        facturaId: null as string | null,
      };

      if (items.length > 1) {
        await onAddVenta(draft, items);
      } else {
        await onAddVenta(draft);
      }

      setDone(true);
      setError('');

      setTimeout(() => {
        setDone(false);
        setNumero('');
        setFecha(todayISO());
        setItems([emptyFormItem()]);
        setTotalRecibido('');
        setLink('');
        setComisionVenta('0');
        setComisionCuota('0');
        setEnvioML('0');
        setEnvioFlex('0');
        setDescuento('0');
        setRetenciones('0');
        setFechaFactura(todayISO());
        setDniCuit('');
        setNombreApellido('');
        setNombreFactura('');
        setCodigoPostal('');
        setLocalidad('');
        setProvincia('');
        setSuggestionsOpen(false);
        setActiveIndex(-1);
        setSuggestionItemIdx(-1);
        setNombreSuggestionsOpen(false);
        setNombreActiveIndex(-1);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la venta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">add_circle</span>
          <h3 className="font-headline-md text-headline-md text-primary">Agregar Venta</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">Datos en el servidor</span>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* ── Datos de la venta ─────────────────────────────── */}
        <div className="space-y-4">
          <SectionLabel icon="point_of_sale">Datos de la venta</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="ID de venta"
              value={numero}
              onChange={setNumero}
              placeholder="V-0001"
              helper="Déjalo vacío para generarlo automáticamente"
            />
            <Field label="Fecha" type="date" value={fecha} onChange={setFecha} required />
            <Field
              label="Total Recibido"
              money
              min={0}
              step="0.01"
              value={totalRecibido}
              onChange={setTotalRecibido}
              placeholder="0.00"
            />
            <Field
              label="Link de la Venta"
              type="url"
              value={link}
              onChange={setLink}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* ── Productos vendidos (dynamic rows) ──────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel icon="shopping_cart">Productos vendidos</SectionLabel>
            <span className="text-on-surface-variant font-body-sm">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>

          {items.map((item, idx) => {
            const matches = getProductMatches(idx);
            const isOpen = suggestionsOpen && suggestionItemIdx === idx;

            return (
              <div
                key={idx}
                className="space-y-3 p-4 bg-surface-container rounded-xl border border-outline-variant/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-on-surface-variant uppercase text-xs">
                    Producto {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Product name with autocomplete */}
                  <div className="space-y-2">
                    <label className="font-label-caps text-on-surface-variant uppercase">
                      Producto Vendido
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={item.producto}
                        onChange={(e) => {
                          updateItem(idx, { producto: e.target.value });
                          setSuggestionsOpen(true);
                          setSuggestionItemIdx(idx);
                        }}
                        onFocus={() => {
                          setSuggestionsOpen(true);
                          setSuggestionItemIdx(idx);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setSuggestionsOpen(false);
                            setSuggestionItemIdx(-1);
                          }, 150);
                        }}
                        onKeyDown={(e) => handleProductKeyDown(e, idx)}
                        placeholder="Producto de la venta"
                        required
                        className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all"
                      />
                      {isOpen && matches.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-lg">
                          {matches.map((name, index) => (
                            <li key={name}>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  updateItem(idx, { producto: name });
                                  setActiveIndex(-1);
                                  setSuggestionsOpen(false);
                                  setSuggestionItemIdx(-1);
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`w-full text-left px-4 py-2.5 transition-colors ${
                                  index === activeIndex
                                    ? 'bg-surface-container text-on-surface'
                                    : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                {name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <Field
                    label="Cantidad"
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(v) => updateItem(idx, { cantidad: parseInt(v) || 0 })}
                    required
                  />

                  <Field
                    label="Precio de Venta"
                    money
                    min={0}
                    step="0.01"
                    value={item.precioVenta}
                    onChange={(v) => updateItem(idx, { precioVenta: v })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addItem}
            className="w-full h-12 border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-2 text-on-surface-variant hover:border-secondary hover:text-secondary transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar otro producto
          </button>
        </div>

        {/* ── Comisiones, envíos y descuentos ───────────────── */}
        <div className="space-y-4">
          <SectionLabel icon="percent">Comisiones, envíos y descuentos</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Comisión por Venta"
              money min={0} step="0.01"
              value={comisionVenta}
              onChange={setComisionVenta}
            />
            <Field
              label="Comisión por Cuota"
              money min={0} step="0.01"
              value={comisionCuota}
              onChange={setComisionCuota}
            />
            <Field label="Envío ML" money min={0} step="0.01" value={envioML} onChange={setEnvioML} />
            <Field
              label="Envío Flex"
              money min={0} step="0.01"
              value={envioFlex}
              onChange={setEnvioFlex}
            />
            <Field
              label="Descuento"
              money min={0} step="0.01"
              value={descuento}
              onChange={setDescuento}
              onCopy={() => copyField('descuento', descuento)}
              copied={copiedField === 'descuento'}
            />
            <Field
              label="Retenciones"
              money min={0} step="0.01"
              value={retenciones}
              onChange={setRetenciones}
            />
          </div>
        </div>

        {/* ── Datos de facturación ──────────────────────────── */}
        <div className="space-y-4">
          <SectionLabel icon="receipt_long">Datos de facturación</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="font-label-caps text-on-surface-variant uppercase">
                Nombre en factura
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nombreFactura}
                  onChange={(e) => {
                    setNombreFactura(e.target.value);
                    setNombreSuggestionsOpen(true);
                  }}
                  onFocus={() => setNombreSuggestionsOpen(true)}
                  onBlur={() => setNombreSuggestionsOpen(false)}
                  onKeyDown={handleNombreKeyDown}
                  placeholder="Ej: Almendra"
                  required
                  className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all"
                />
                {nombreSuggestionsOpen && nombreMatches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-lg">
                    {nombreMatches.map((name, index) => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setNombreFactura(name);
                            setNombreActiveIndex(-1);
                            setNombreSuggestionsOpen(false);
                          }}
                          onMouseEnter={() => setNombreActiveIndex(index)}
                          className={`w-full text-left px-4 py-2.5 transition-colors ${
                            index === nombreActiveIndex
                              ? 'bg-surface-container text-on-surface'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <Field
              label="Fecha de Factura"
              type="date"
              value={fechaFactura}
              onChange={setFechaFactura}
              required
            />
            <Field
              label="DNI / CUIT"
              value={dniCuit}
              onChange={setDniCuit}
              placeholder="20-12345678-9"
              required
              onCopy={() => copyField('dniCuit', dniCuit)}
              copied={copiedField === 'dniCuit'}
            />
            <Field
              label="Nombre Apellido"
              value={nombreApellido}
              onChange={setNombreApellido}
              placeholder="Nombre y apellido"
              required
            />
          </div>
        </div>

        {/* ── Jurisdicción ──────────────────────────────────── */}
        <div className="space-y-4">
          <SectionLabel icon="location_on">Jurisdicción</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Código Postal"
              value={codigoPostal}
              onChange={setCodigoPostal}
              placeholder="Ej: 1640"
              required
            />
            <Field
              label="Localidad"
              value={localidad}
              onChange={setLocalidad}
              placeholder="Localidad"
              required
            />
            <Field
              label="Provincia"
              value={provincia}
              onChange={setProvincia}
              placeholder="Provincia"
              required
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-error font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={invalid || done || submitting}
          className={`w-full h-14 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
            done
              ? 'bg-primary text-on-primary'
              : 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-secondary/10'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {done ? (
            <>
              <span className="material-symbols-outlined">done_all</span>
              ¡Venta Cargada!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">check_circle</span>
              Cargar Venta
            </>
          )}
        </button>
      </form>
    </section>
  );
}
