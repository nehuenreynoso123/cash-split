import { useEffect, useState } from 'react';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { createVentaFacturacion, createFacturaFacturacion, deleteVentaFacturacion, listVentasFacturacion, type VentaFacturacion } from '../../lib/api';
import VentasTable from './VentasTable';
import FacturasTable from './FacturasTable';
import AgregarVentaForm from './AgregarVentaForm';
import ComisionesRetencionesTable from './ComisionesRetencionesTable';
import type { Venta, VentaFormItem } from './ventas';

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
    nroFactura: String(row.nro_factura).padStart(2, '0'),
    fechaFactura: row.fecha_factura,
    jurisdiccion: {
      codigoPostal: row.codigo_postal ?? '',
      localidad: row.localidad ?? '',
      provincia: row.provincia ?? '',
    },
    dniCuit: row.dni_cuit ?? '',
    nombreApellido: row.nombre_apellido ?? '',
    nombreFactura: row.nombre_factura ?? '',
    link: row.link ?? '',
    facturaId: row.factura_id ?? null,
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
  const [deleteError, setDeleteError] = useState('');

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

  const handleAddVenta = async (
    draft: Omit<Venta, 'id' | 'nroFactura' | 'importe'>,
    items?: VentaFormItem[],
  ) => {
    if (items && items.length > 0) {
      // Multi-product invoice
      const rows = await createFacturaFacturacion({
        numero: draft.numero,
        items: items.map((it) => ({
          producto: it.producto,
          cantidad: it.cantidad,
          precio_venta: parseFloat(it.precioVenta) || 0,
        })),
        fecha: draft.fecha,
        comisionVenta: draft.comisionVenta,
        comisionCuota: draft.comisionCuota,
        envioML: draft.envioML,
        envioFlex: draft.envioFlex,
        descuento: draft.descuento,
        retenciones: draft.retenciones,
        totalRecibido: draft.totalRecibido,
        fechaFactura: draft.fechaFactura,
        jurisdiccion: draft.jurisdiccion,
        dniCuit: draft.dniCuit,
        nombreApellido: draft.nombreApellido,
        nombreFactura: draft.nombreFactura,
        link: draft.link,
      });
      setVentas((prev) => [...prev, ...rows.map(toVenta)]);
    } else {
      // Single product (backward compat)
      const row = await createVentaFacturacion(draft);
      setVentas((prev) => [...prev, toVenta(row)]);
    }
  };

  // Sequential delete keeps state consistent: each successful call drops its
  // row from state and the first failure aborts the batch, surfacing the
  // backend's message above the tables (the table clears its selection after
  // the batch; on failure the remaining rows stay listed so they can be
  // reselected and retried — rows already deleted server-side are gone here).
  const handleDelete = async (ids: number[]) => {
    setDeleteError('');
    const deleted: number[] = [];
    for (const id of ids) {
      try {
        await deleteVentaFacturacion(id);
        deleted.push(id);
      } catch (err) {
        setDeleteError(
          err instanceof Error ? err.message : 'No se pudo borrar la venta seleccionada.'
        );
        break;
      }
    }
    if (deleted.length > 0) {
      setVentas((prev) => prev.filter((v) => !deleted.includes(v.id)));
    }
  };

  // Unique, trimmed product names already present — feeds the form autocomplete.
  const productosExistentes = Array.from(
    new Set(ventas.map((v) => v.producto.trim()).filter((p) => p.length > 0))
  );

  // Unique, trimmed invoice names already present (who the invoice is for) —
  // feeds the form's name autocomplete. Shows on focus, no minimum chars.
  const nombresExistentes = Array.from(
    new Set(ventas.map((v) => v.nombreFactura.trim()).filter((n) => n.length > 0))
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
      {deleteError && (
        <p role="alert" className="text-error font-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {deleteError}
        </p>
      )}

      {/* All tabs stay mounted — visibility toggles with `hidden` so the
          Agregar Venta form draft and the ventas list survive tab switches. */}
      <div className={activeTab === 'ventas' ? 'space-y-gutter' : 'hidden'}>
        <VentasTable ventas={ventas} />
      </div>
      <div className={activeTab === 'facturacion' ? '' : 'hidden'}>
        <FacturasTable ventas={ventas} onDelete={handleDelete} />
      </div>
      <div className={activeTab === 'comisionesRetenciones' ? '' : 'hidden'}>
        <ComisionesRetencionesTable ventas={ventas} />
      </div>
      <div className={activeTab === 'agregarVenta' ? '' : 'hidden'}>
        <AgregarVentaForm
          onAddVenta={handleAddVenta}
          productosExistentes={productosExistentes}
          nombresExistentes={nombresExistentes}
        />
      </div>
    </div>
  );
}
