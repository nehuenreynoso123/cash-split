import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { todayISO } from '../../lib/data';
import type { Venta } from './ventas';

interface AgregarVentaFormProps {
  onAddVenta: (draft: Omit<Venta, 'id' | 'numero' | 'nroFactura'>) => void;
}

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date';
  money?: boolean;
  min?: number;
  step?: string;
  required?: boolean;
  placeholder?: string;
}

// Labeled field with the shared input shell; `money` adds the $ prefix and the
// mono font used by every monetary input in the form.
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

export default function AgregarVentaForm({ onAddVenta }: AgregarVentaFormProps) {
  // Datos de la venta
  const [producto, setProducto] = useState('');
  // Dates start EMPTY to avoid a hydration mismatch (the static build bakes the
  // build-time clock into SSR output); they are filled after mount below.
  const [fecha, setFecha] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioVenta, setPrecioVenta] = useState('');
  const [importe, setImporte] = useState('');
  const [totalRecibido, setTotalRecibido] = useState('');
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
  // Jurisdicción
  const [codigoPostal, setCodigoPostal] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [provincia, setProvincia] = useState('');
  // Feedback
  const [done, setDone] = useState(false);

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

  const invalid =
    !producto.trim() ||
    !fecha ||
    !fechaFactura ||
    !nombreApellido.trim() ||
    cantidad < 1 ||
    !isPositive(precioVenta) ||
    !isPositive(importe) ||
    !isPositive(totalRecibido);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    onAddVenta({
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
      totalRecibido: parseFloat(totalRecibido),
      importe: parseFloat(importe),
      fechaFactura,
      jurisdiccion: {
        codigoPostal: codigoPostal.trim(),
        localidad: localidad.trim(),
        provincia: provincia.trim(),
      },
      dniCuit: dniCuit.trim(),
      nombreApellido: nombreApellido.trim(),
    });

    setDone(true);

    // Brief "¡Venta Cargada!" feedback, then reset to defaults.
    setTimeout(() => {
      setDone(false);
      setProducto('');
      setFecha(todayISO());
      setCantidad(1);
      setPrecioVenta('');
      setImporte('');
      setTotalRecibido('');
      setComisionVenta('0');
      setComisionCuota('0');
      setEnvioML('0');
      setEnvioFlex('0');
      setDescuento('0');
      setRetenciones('0');
      setFechaFactura(todayISO());
      setDniCuit('');
      setNombreApellido('');
      setCodigoPostal('');
      setLocalidad('');
      setProvincia('');
    }, 2000);
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">add_circle</span>
          <h3 className="font-headline-md text-headline-md text-primary">Agregar Venta</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">Datos locales</span>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="space-y-4">
          <SectionLabel icon="point_of_sale">Datos de la venta</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Producto Vendido"
              value={producto}
              onChange={setProducto}
              placeholder="Producto de la venta"
              required
            />
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
              label="Importe"
              money
              min={0}
              step="0.01"
              value={importe}
              onChange={setImporte}
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
              required
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
            <Field
              label="Fecha de Factura"
              type="date"
              value={fechaFactura}
              onChange={setFechaFactura}
              required
            />
            <Field label="DNI / CUIT" value={dniCuit} onChange={setDniCuit} placeholder="20-12345678-9" />
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
            />
            <Field label="Localidad" value={localidad} onChange={setLocalidad} placeholder="Localidad" />
            <Field label="Provincia" value={provincia} onChange={setProvincia} placeholder="Provincia" />
          </div>
        </div>

        <button
          type="submit"
          disabled={invalid || done}
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
