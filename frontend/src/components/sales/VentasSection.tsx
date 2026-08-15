import { useState } from 'react';
import SaleForm from './SaleForm';
import SaleHistory from './SaleHistory';
import GananciaTotalCard from './GananciaTotalCard';
import FacturacionSection from '../facturacion/FacturacionSection';
import ComisionesTable from '../comisiones/ComisionesTable';
import RetencionesTable from '../retenciones/RetencionesTable';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

type TabId = 'ventas' | 'facturacion' | 'comisiones' | 'retenciones';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ventas', label: 'Ventas', icon: 'point_of_sale' },
  { id: 'facturacion', label: 'Facturación', icon: 'receipt_long' },
  { id: 'comisiones', label: 'Comisiones', icon: 'payments' },
  { id: 'retenciones', label: 'Retenciones', icon: 'account_balance' },
];

export default function VentasSection() {
  useAuthRedirect();

  const [activeTab, setActiveTab] = useState<TabId>('ventas');
  const [formOpen, setFormOpen] = useState(false);
  // Bumped after each sale completes so SaleHistory (which loads on mount)
  // remounts via `key` and refetches the latest backend data.
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaleComplete = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-7xl mx-auto space-y-gutter">
      {/* Tab bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-2 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body-base font-medium whitespace-nowrap transition-all ${
              activeTab === t.id
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Ventas — GananciaTotalCard fetches real data; the other three stat cards are static placeholders */}
      <div className={activeTab === 'ventas' ? 'space-y-gutter' : 'hidden'}>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <GananciaTotalCard />
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-2">
              <span className="text-on-surface-variant font-label-caps uppercase tracking-wider">Tickets Emitidos</span>
              <div className="flex items-baseline justify-between">
                <span className="font-data-mono text-display-lg text-primary">28</span>
                <span className="text-on-surface-variant flex items-center font-body-sm">Media: $44</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-2">
              <span className="text-on-surface-variant font-label-caps uppercase tracking-wider">Margen Promedio</span>
              <div className="flex items-baseline justify-between">
                <span className="font-data-mono text-display-lg text-primary">24.5%</span>
                <span className="text-error flex items-center font-body-sm">-2% <span className="material-symbols-outlined text-[16px]">trending_down</span></span>
              </div>
            </div>
            <div className="bg-secondary text-on-secondary p-6 rounded-xl flex flex-col gap-2 shadow-lg shadow-secondary/10">
              <span className="opacity-80 font-label-caps uppercase tracking-wider">Balance Liquidez</span>
              <div className="flex items-baseline justify-between">
                <span className="font-data-mono text-display-lg">$4,520.12</span>
                <span className="material-symbols-outlined opacity-60">account_balance_wallet</span>
              </div>
            </div>
          </div>

          {/* Toolbar: toggles the SaleForm panel */}
          <div className="flex justify-end">
            <button
              onClick={() => setFormOpen((v) => !v)}
              className={`flex items-center gap-2 h-12 px-5 font-bold rounded-xl transition-all active:scale-95 shadow-lg ${
                formOpen
                  ? 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant shadow-none hover:bg-surface-container'
                  : 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-secondary/10'
              }`}
            >
              <span className="material-symbols-outlined">{formOpen ? 'close' : 'add'}</span>
              {formOpen ? 'Cerrar Formulario' : 'Agregar Venta'}
            </button>
          </div>

          {/* Main grid: Form + History — both stay mounted; SaleHistory remounts only via refreshKey */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className={formOpen ? 'lg:col-span-5' : 'hidden'}>
              <SaleForm onSaleComplete={handleSaleComplete} />
            </div>
            <div className={formOpen ? 'lg:col-span-7' : 'lg:col-span-12'}>
              <SaleHistory key={refreshKey} />
            </div>
          </div>
        </div>

      {/* Tab: Facturación — mock data */}
      <div className={activeTab === 'facturacion' ? '' : 'hidden'}>
        <FacturacionSection />
      </div>

      {/* Tab: Comisiones — mock data */}
      <div className={activeTab === 'comisiones' ? '' : 'hidden'}>
        <ComisionesTable />
      </div>

      {/* Tab: Retenciones — mock data */}
      <div className={activeTab === 'retenciones' ? '' : 'hidden'}>
        <RetencionesTable />
      </div>
    </div>
  );
}
