import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { todayISO } from '../../lib/data';
import type { Venta } from './ventas';

interface AgregarVentaFormProps {
  onAddVenta: (draft: Omit<Venta, 'id' | 'nroFactura' | 'importe'>) => Promise<void>;
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
}

// Labeled field with the shared input shell; `money` adds the $ prefix and the
// mono font used by every monetary input in the form. `helper` renders a small
// hint below the input (e.g. to mark an optional field).
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
      <label className="font-label-caps text-on-surface-variant uppercase">{label}</label>
      {money ? (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">
            $
          </span>
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

export default function AgregarVentaForm({
  onAddVenta,
  productosExistentes,
  nombresExistentes,
}: AgregarVentaFormProps) {
  // Datos de la venta
  const [numero, setNumero] = useState('');
  const [producto, setProducto] = useState('');
  // Dates start EMPTY to avoid a hydration mismatch (the static build bakes the
  // build-time clock into SSR output); they are filled after mount below.
  const [fecha, setFecha] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioVenta, setPrecioVenta] = useState('');
  const [totalRecibido, setTotalRecibido] = useState('');
  const [link, setLink] = useState('');
  // Comisiones, envíos y descuentos (default to 0)
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
  // A nombre de quién se factura (REQUIRED; numera sus propias facturas)
  const [nombreFactura, setNombreFactura] = useState('');
  // Jurisdicción
  const [codigoPostal, setCodigoPostal] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [provincia, setProvincia] = useState('');
  // Autocomplete de producto
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Autocomplete de nombre de factura
  const [nombreSuggestionsOpen, setNombreSuggestionsOpen] = useState(false);
  const [nombreActiveIndex, setNombreActiveIndex] = useState(-1);
  // Feedback
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Default the date inputs to today, client-side only.
  useEffect(() => {
    setFecha(todayISO());
    setFechaFactura(todayISO());
  }, []);

  // Money guards must reject empty/NaN input: parseFloat('') is NaN and
  // `NaN <= 0` is false, so each check requires a finite positive number.
  const isPositive = (value: string) => {
    const n = parseFloat(value);
    return Number.isFinite(n) && n > 0;
  };

  // Autocomplete suggestions: only when the trimmed query has 3+ chars;
  // case-insensitive substring match over the products already loaded.
  const productQuery = producto.trim().toLowerCase();
  const matches =
    productQuery.length >= 3
      ? productosExistentes.filter((p) => p.toLowerCase().includes(productQuery))
      : [];

  // A stale active index must never point at a different list: reset it on
  // every query change (ArrowDown/ArrowUp navigate within the current list).
  useEffect(() => {
    setActiveIndex(-1);
  }, [productQuery]);

  // Keyboard navigation: ArrowDown/ArrowUp move the active suggestion, Enter
  // selects it (preventDefault so the form does not submit), Escape closes.
  const handleProductKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (suggestionsOpen) {
        e.preventDefault();
        setSuggestionsOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (!suggestionsOpen || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < matches.length) {
        e.preventDefault();
        setProducto(matches[activeIndex]);
        setActiveIndex(-1);
        setSuggestionsOpen(false);
      }
      // No active index: let Enter submit the form as usual.
    }
  };

  // Name autocomplete: unlike products there is NO minimum char count — the
  // distinct invoice names are few (Almendra, Nehuen...), so the list shows on
  // focus and narrows as the user types. Same keyboard UX as the product field.
  const nombreQuery = nombreFactura.trim().toLowerCase();
  const nombreMatches = nombreQuery
    ? nombresExistentes.filter((n) => n.toLowerCase().includes(nombreQuery))
    : nombresExistentes;

  // A stale active index must never point at a different list: reset it on
  // every query change (same reasoning as the product autocomplete).
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
      // No active index: let Enter submit the form as usual.
    }
  };

  // Part A root cause: totalRecibido used to be REQUIRED here, so leaving
  // "Total Recibido" empty (a common case) permanently disabled the Cargar
  // Venta button. It is now OPTIONAL — the server defaults it to 0. In
  // exchange, dniCuit/codigoPostal/localidad/provincia/nombreFactura are
  // required (validated on both ends).
  const invalid =
    !producto.trim() ||
    !fecha ||
    !fechaFactura ||
    !nombreApellido.trim() ||
    !nombreFactura.trim() ||
    !dniCuit.trim() ||
    !codigoPostal.trim() ||
    !localidad.trim() ||
    !provincia.trim() ||
    cantidad < 1 ||
    !isPositive(precioVenta);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    setSubmitting(true);
    try {
      await onAddVenta({
        numero: numero.trim(),
        producto: producto.trim(),
        fecha,
        cantidad,
        precioVenta: parseFloat(precioVenta),
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
      });

      setDone(true);
      setError('');

      // Brief "¡Venta Cargada!" feedback, then reset to defaults.
      setTimeout(() => {
        setDone(false);
        setNumero('');
        setProducto('');
        setFecha(todayISO());
        setCantidad(1);
        setPrecioVenta('');
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
        setNombreSuggestionsOpen(false);
        setNombreActiveIndex(-1);
      }, 2000);
    } catch (err) {
      // Keep the draft intact so the user can fix and retry.
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
        <div className="space-y-4">
          <SectionLabel icon="point_of_sale">Datos de la venta</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ID de venta OPTIONAL: a typed value is stored as-is; left empty
                the backend derives V-#### from the row id automatically. */}
            <Field
              label="ID de venta"
              value={numero}
              onChange={setNumero}
              placeholder="V-0001"
              helper="Déjalo vacío para generarlo automáticamente"
            />
            {/* Producto Vendido with autocomplete: suggestions show for 3+
                typed chars and are selected with onMouseDown so the click wins
                the race against the input's onBlur. */}
            <div className="space-y-2">
              <label className="font-label-caps text-on-surface-variant uppercase">
                Producto Vendido
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={producto}
                  onChange={(e) => {
                    setProducto(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => setSuggestionsOpen(false)}
                  onKeyDown={handleProductKeyDown}
                  placeholder="Producto de la venta"
                  required
                  className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all"
                />
                {suggestionsOpen && matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-lg">
                    {matches.map((name, index) => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setProducto(name);
                            setActiveIndex(-1);
                            setSuggestionsOpen(false);
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
            <Field label="Fecha" type="date" value={fecha} onChange={setFecha} required />
            <Field
              label="Cantidad"
              type="number"
              min={1}
              value={cantidad}
              onChange={(v) => setCantidad(parseInt(v) || 0)}
              required
            />
            <Field
              label="Precio de Venta"
              money
              min={0}
              step="0.01"
              value={precioVenta}
              onChange={setPrecioVenta}
              placeholder="0.00"
              required
            />
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

        <div className="space-y-4">
          <SectionLabel icon="percent">Comisiones, envíos y descuentos</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Comisión por Venta"
              money
              min={0}
              step="0.01"
              value={comisionVenta}
              onChange={setComisionVenta}
            />
            <Field
              label="Comisión por Cuota"
              money
              min={0}
              step="0.01"
              value={comisionCuota}
              onChange={setComisionCuota}
            />
            <Field label="Envío ML" money min={0} step="0.01" value={envioML} onChange={setEnvioML} />
            <Field
              label="Envío Flex"
              money
              min={0}
              step="0.01"
              value={envioFlex}
              onChange={setEnvioFlex}
            />
            <Field
              label="Descuento"
              money
              min={0}
              step="0.01"
              value={descuento}
              onChange={setDescuento}
            />
            <Field
              label="Retenciones"
              money
              min={0}
              step="0.01"
              value={retenciones}
              onChange={setRetenciones}
            />
          </div>
        </div>

        <div className="space-y-4">
          <SectionLabel icon="receipt_long">Datos de facturación</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Factura a nombre de — who the invoice is issued for. Same
                autocomplete as the product field, but with NO minimum chars:
                the distinct names are few, so show them on focus and narrow
                as the user types. */}
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
