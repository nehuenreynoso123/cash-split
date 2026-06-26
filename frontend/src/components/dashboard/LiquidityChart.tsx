const months = [
  { label: 'Ene', height: 40 },
  { label: 'Feb', height: 55 },
  { label: 'Mar', height: 45 },
  { label: 'Abr', height: 70 },
  { label: 'May', height: 60 },
  { label: 'Jun', height: 85 },
  { label: 'Jul', height: 95, active: true },
];

export default function LiquidityChart() {
  return (
    <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden group">
      <div className="relative z-10">
        <h4 className="font-headline-md text-headline-md text-primary mb-4">
          Proyección de Liquidez
        </h4>

        <div className="h-48 w-full flex items-end gap-2 px-2">
          {months.map((m) => (
            <div
              key={m.label}
              className={`flex-1 rounded-t-lg transition-all duration-500 ${
                m.active
                  ? 'bg-secondary shadow-lg'
                  : 'bg-surface-container-high group-hover:bg-secondary-container'
              }`}
              style={{ height: `${m.height}%` }}
            />
          ))}
        </div>

        <div className="flex justify-between mt-4 text-xs font-label-caps text-on-surface-variant uppercase">
          {months.map((m) => (
            <span key={m.label} className={m.active ? 'text-primary font-bold' : ''}>
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-secondary opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
