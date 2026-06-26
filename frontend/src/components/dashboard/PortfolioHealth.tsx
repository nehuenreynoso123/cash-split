interface HealthProps {
  rendimiento: number;
  controlGastos: number;
  retornoInversion: number;
}

const metrics = [
  { label: 'Rendimiento Operativo', key: 'rendimiento' as const, color: 'bg-secondary-container' },
  { label: 'Control de Gastos', key: 'controlGastos' as const, color: 'bg-on-tertiary-container' },
  { label: 'Retorno Inversión', key: 'retornoInversion' as const, color: 'bg-green-400' },
];

export default function PortfolioHealth({ rendimiento, controlGastos, retornoInversion }: HealthProps) {
  const values = { rendimiento, controlGastos, retornoInversion };

  return (
    <div className="bg-primary text-on-primary rounded-xl p-6 flex flex-col">
      <h4 className="font-headline-md text-headline-md mb-2">Portfolio Health</h4>
      <p className="text-body-sm opacity-70 mb-6">
        Tu ratio de eficiencia operativa actual es excelente.
      </p>

      <div className="space-y-4 flex-1">
        {metrics.map((m) => (
          <div key={m.key}>
            <div className="flex justify-between items-center text-sm">
              <span className="opacity-80">{m.label}</span>
              <span className="font-data-mono">{values[m.key]}%</span>
            </div>
            <div className="w-full bg-primary-container h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`${m.color} h-full rounded-full`}
                style={{ width: `${values[m.key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="mt-8 w-full py-3 bg-white text-primary font-bold rounded-lg hover:bg-opacity-90 transition-all active:scale-[0.98]">
        Ver Reporte Completo
      </button>
    </div>
  );
}
