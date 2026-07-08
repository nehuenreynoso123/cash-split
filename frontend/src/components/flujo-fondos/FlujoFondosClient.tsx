import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import { getTotalCajas, getLiquidezTotal, type TotalCaja } from '../../lib/api';
import { formatCurrency } from '../../lib/data';

interface CajaInfo {
  id: string;
  titulo: string;
  valor: string;
  icono: string;
  colorIcono: string;
  bordeClase: string;
  descripcion: string;
  detalle: string;
}

function buildCajas(
  liquidezDisponible: number,
  totalInvertido: number,
  gananciaReal: number,
  costoReposicion: number,
  gananciaPorCobrar: number,
): CajaInfo[] {
  return [
    {
      id: 'liquidez-dinero',
      titulo: 'Liquidez Dinero',
      valor: formatCurrency(liquidezDisponible),
      icono: 'account_balance_wallet',
      colorIcono: 'text-green-500',
      bordeClase: 'border-l-green-500',
      descripcion: '100% disponible. No tiene stock asignado todavía.',
      detalle:
        'Es el motor en reposo. Te da la velocidad de reaccionar si aparece una oferta de oportunidad del proveedor o absorber un imprevisto sin frenar las compras.',
    },
    {
      id: 'total-invertido',
      titulo: 'Total Invertido',
      valor: formatCurrency(totalInvertido),
      icono: 'inventory_2',
      colorIcono: 'text-blue-500',
      bordeClase: 'border-l-blue-500',
      descripcion: 'Suma total de (Costo Base + Ganancia Reinvertida).',
      detalle:
        'Es la métrica del tamaño de tu negocio. Si este número sube mes a mes, tu rueda se está agrandando (Efecto bola de nieve).',
    },
    {
      id: 'ganancia',
      titulo: 'Ganancia',
      valor: formatCurrency(gananciaReal),
      icono: 'savings',
      colorIcono: 'text-emerald-500',
      bordeClase: 'border-l-emerald-500',
      descripcion: 'Precio de Venta menos Costo de Mercadería.',
      detalle:
        'El valor bruto generado por tu trabajo. De este bloque se alimentan las cajas operativas, de reserva y de escala.',
    },
    {
      id: 'caja-reposicion',
      titulo: 'Caja Reposición Base',
      valor: formatCurrency(costoReposicion),
      icono: 'shield',
      colorIcono: 'text-purple-500',
      bordeClase: 'border-l-purple-500',
      descripcion: 'El 100% del costo viejo de la mercadería. Es intocable para gastos personales.',
      detalle:
        'Garantizar la supervivencia. Asegura que cuando cobres, recuperás los mismos pesos exactos que te costó el stock para volver a comprar la misma cantidad.',
    },
    {
      id: 'ganancia-cobrar',
      titulo: 'Ganancia por Cobrar',
      valor: formatCurrency(gananciaPorCobrar),
      icono: 'hourglass_bottom',
      colorIcono: 'text-orange-500',
      bordeClase: 'border-l-orange-500',
      descripcion: 'Margen de las ventas ya hechas pero retenidas por Mercado Pago, tarjetas o clientes.',
      detalle:
        'Medir tu descalce financiero. Te dice cuánta ganancia tenés "en el aire" esperando impactar en tu cuenta.',
    },
    {
      id: 'caja-operativa',
      titulo: 'Caja Operativa',
      valor: formatCurrency(Math.round(gananciaReal * 0.3)),
      icono: 'work_history',
      colorIcono: 'text-cyan-500',
      bordeClase: 'border-l-cyan-500',
      descripcion: '30% de la Ganancia Real (o un sueldo fijo mensual estipulado por vos).',
      detalle:
        'Pagarte a vos por tu trabajo diario y cubrir los gastos fijos del negocio (envíos, publicidad, monotributo) para no tocar el capital de trabajo.',
    },
    {
      id: 'caja-amortiguacion',
      titulo: 'Caja de Amortiguación (Reserva)',
      valor: formatCurrency(Math.round(gananciaReal * 0.1)),
      icono: 'security',
      colorIcono: 'text-rose-500',
      bordeClase: 'border-l-rose-500',
      descripcion: '10% de la Ganancia Real acumulada hasta armar un colchón equivalente a 1 mes de costos.',
      detalle:
        'El airbag del negocio. Se usa exclusivamente si el proveedor se atrasa con la entrega o si las ventas caen drásticamente una semana.',
    },
  ];
}

export default function FlujoFondosClient() {
  const [selected, setSelected] = useState<CajaInfo | null>(null);
  const [cajas, setCajas] = useState<CajaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getTotalCajas().catch(() => [] as TotalCaja[]),
      getLiquidezTotal().catch(() => 0),
    ]).then(([totalCajasData, netoLiquidez]) => {
      const totalInvertido = totalCajasData.reduce((s, r) => s + Number(r.costo_invertido_stock), 0);
      const gananciaReal = totalCajasData.reduce((s, r) => s + Number(r.ganancia_real_total), 0);
      const costoReposicion = totalCajasData.reduce((s, r) => s + Number(r.costo_reposicion_total), 0);
      // Ganancia por cobrar: total de ingresos de ventas que NO tienen fecha_cobro (pendientes)
      const gananciaPorCobrar = totalCajasData.reduce((s, r) => {
        const ingresos = Number(r.ingresos_totales);
        const costo = Number(r.costo_reposicion_total);
        return s + (ingresos - costo);
      }, 0);

      const liquidezDisponible = totalInvertido - costoReposicion + netoLiquidez;
      const built = buildCajas(liquidezDisponible, totalInvertido, gananciaReal, costoReposicion, gananciaPorCobrar);
      setCajas(built);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-gutter">
      {/* Encabezado */}
      <div className="flex items-start gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <span className="material-symbols-outlined text-secondary text-3xl mt-1">account_tree</span>
        <div>
          <h2 className="font-headline-md text-headline-md text-primary mb-1">
            Estructura de Capital
          </h2>
          <p className="text-body-sm text-on-surface-variant max-w-2xl">
            Cada caja representa un bloque de tu flujo de fondos.
            Tocá cualquier tarjeta para ver su detalle y entender cómo se compone.
          </p>
        </div>
      </div>

      {/* Grilla de cajas */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin mr-2">sync</span>
          Calculando estructura de capital...
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {cajas.map((caja) => (
          <button
            key={caja.id}
            onClick={() => setSelected(caja)}
            className={`text-left w-full bg-surface-container-lowest border border-outline-variant border-l-4 rounded-xl p-stack_lg hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group ${caja.bordeClase}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                {caja.titulo}
              </span>
              <span className={`material-symbols-outlined ${caja.colorIcono} group-hover:scale-110 transition-transform`}>
                {caja.icono}
              </span>
            </div>

            <span className="font-data-mono text-display-lg text-primary block mb-2">
              {caja.valor}
            </span>

            <p className="text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
              {caja.descripcion}
            </p>

            <div className="mt-3 flex items-center gap-1 text-secondary text-label-caps text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Ver detalle</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </div>
          </button>
        ))}
      </div>
      )}

      {/* Modal de detalle */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.titulo ?? ''}>
        {selected && (
          <div className="px-8 py-6 space-y-5">
            <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-4xl ${selected.colorIcono}`}>
                {selected.icono}
              </span>
              <div>
                <span className="font-data-mono text-display-sm text-primary">
                  {selected.valor}
                </span>
                <p className="text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mt-1">
                  {selected.titulo}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant">
              <p className="font-body-base text-on-surface leading-relaxed">
                {selected.descripcion}
              </p>
            </div>

            <div className="border-t border-outline-variant pt-5">
              <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-2">
                ¿Para qué sirve?
              </h4>
              <p className="font-body-base text-on-surface-variant leading-relaxed">
                {selected.detalle}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
