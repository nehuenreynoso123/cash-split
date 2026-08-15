import { useState } from 'react';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
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

export default function FacturacionTabs() {
  useAuthRedirect();

  const [activeTab, setActiveTab] = useState<TabId>('ventas');

  // Local sales array — starts EMPTY; rows are added manually via the form.
  // One counter drives id, numero and nroFactura so the three tables (Ventas,
  // Facturas, Comisiones y Retenciones) project the same record consistently.
  // Nro de factura starts at 202 and ascends (202, 203, 204...).
  const NRO_FACTURA_INICIAL = 202;
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [seq, setSeq] = useState(1);

  const handleAddVenta = (draft: Omit<Venta, 'id' | 'numero' | 'nroFactura'>) => {
    setVentas((prev) => [
      ...prev,
      {
        id: seq,
        numero: `V-${String(seq).padStart(4, '0')}`,
        nroFactura: String(NRO_FACTURA_INICIAL + seq - 1),
        ...draft,
      },
    ]);
    setSeq((s) => s + 1);
  };

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
        <AgregarVentaForm onAddVenta={handleAddVenta} />
      </div>
    </div>
  );
}
