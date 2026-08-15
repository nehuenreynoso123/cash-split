import { useEffect, useState } from 'react';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { createVentaFacturacion, listVentasFacturacion, type VentaFacturacion } from '../../lib/api';
import VentasTable from './VentasTable';
import FacturasTable from './FacturasTable';
import AgregarVentaForm from './AgregarVentaForm';
import ComisionesRetencionesTable from './ComisionesRetencionesTable';
import type { Venta } from './ventas';

type TabId = 'ventas' | 'facturacion' | 'comisionesRetenciones' | 'agregarVenta';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ventas', label: 'Ventas', icon: 'point_of_sale' },
  { id: 'facturacion', label: 'Facturación', icon: 'receipt_long' },
  { id: 'comisionesRetenciones', label: 'Comisiones y Retenciones', icon: 'request_quote' },
  { id: 'agregarVenta', label: 'Agregar Venta', icon: 'add_circle' },
];

// Map a backend row (snake_case) onto the local camelCase Venta model used by
// the three table projections. Optional text fields default to '' and money is
// coerced to number (the backend returns NUMERIC as string via postgres.js).
function toVenta(row: VentaFacturacion): Venta {
  return {
    id: row.id,
    numero: row.numero,
    producto: row.producto,
    fecha: row.fecha,
    cantidad: row.cantidad,
    precioVenta: Number(row.precio_venta),
    comisionVenta: Number(row.comision_venta),
    comisionCuota: Number(row.comision_cuota),
    envioML: Number(row.envio_ml),
    envioFlex: Number(row.envio_flex),
    descuento: Number(row.descuento),
    retenciones: Number(row.retenciones),
    totalRecibido: Number(row.total_recibido),
    importe: Number(row.importe),
    nroFactura: String(row.nro_factura),
    fechaFactura: row.fecha_factura,
    jurisdiccion: {
      codigoPostal: row.codigo_postal ?? '',
      localidad: row.localidad ?? '',
      provincia: row.provincia ?? '',
    },
    dniCuit: row.dni_cuit ?? '',
    nombreApellido: row.nombre_apellido ?? '',
    link: row.link ?? '',
  };
}

// Merge backend rows into state by id. Used when the mount GET resolves after
// a sale was already appended locally: replacing state then would silently
// drop that row, so prev rows win and brand-new ids from data are appended
// (Map preserves insertion order — prev first, then new ids in data order).
function mergeById(prev: Venta[], rows: Venta[]): Venta[] {
  const byId = new Map<number, Venta>(prev.map((v) => [v.id, v]));
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

export default function FacturacionTabs() {
  useAuthRedirect();

  const [activeTab, setActiveTab] = useState<TabId>('ventas');

  // Sales are persisted server-side; the list is loaded once on mount and new
  // rows are appended with the backend-assigned id/numero/nroFactura.
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listVentasFacturacion()
      .then((rows) => {
        // Merge instead of replace: the GET may resolve after a sale created
        // in this session was appended to state — replacing would lose it.
        if (!cancelled) setVentas((prev) => mergeById(prev, rows.map(toVenta)));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'No se pudieron cargar las ventas de facturación.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddVenta = async (draft: Omit<Venta, 'id' | 'numero' | 'nroFactura' | 'importe'>) => {
    const row = await createVentaFacturacion(draft);
    // Backend returns rows ordered by id ASC, so appending keeps that order.
    setVentas((prev) => [...prev, toVenta(row)]);
  };

  // Unique, trimmed product names already present — feeds the form autocomplete.
  const productosExistentes = Array.from(
    new Set(ventas.map((v) => v.producto.trim()).filter((p) => p.length > 0))
  );

  return (
    <div className="space-y-gutter">
      {/* Pill-style tab bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-2 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-body-base whitespace-nowrap transition-all rounded-lg ${
              activeTab === tab.id
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* One-line load/error status, visible on every tab */}
      {loading ? (
        <p className="text-on-surface-variant font-body-sm">Cargando ventas…</p>
      ) : (
        loadError && <p className="text-error font-body-sm">{loadError}</p>
      )}

      {/* All tabs stay mounted — visibility toggles with `hidden` so the
          Agregar Venta form draft and the ventas list survive tab switches. */}
      <div className={activeTab === 'ventas' ? 'space-y-gutter' : 'hidden'}>
        <VentasTable ventas={ventas} />
      </div>
      <div className={activeTab === 'facturacion' ? '' : 'hidden'}>
        <FacturasTable ventas={ventas} />
      </div>
      <div className={activeTab === 'comisionesRetenciones' ? '' : 'hidden'}>
        <ComisionesRetencionesTable ventas={ventas} />
      </div>
      <div className={activeTab === 'agregarVenta' ? '' : 'hidden'}>
        <AgregarVentaForm onAddVenta={handleAddVenta} productosExistentes={productosExistentes} />
      </div>
    </div>
  );
}
