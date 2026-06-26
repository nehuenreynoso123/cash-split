interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  children: string;
}

const variants = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-orange-100 text-orange-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

const dots = {
  success: 'bg-green-600',
  warning: 'bg-orange-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[variant]}`} />
      {children}
    </span>
  );
}

export function statusBadge(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'disponible':
    case 'pagado':
      return 'success';
    case 'stock_bajo':
    case 'pendiente':
      return 'warning';
    case 'agotado':
      return 'error';
    default:
      return 'info';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'disponible': return 'Disponible';
    case 'stock_bajo': return 'Stock Bajo';
    case 'agotado': return 'Agotado';
    case 'pagado': return 'Pagado';
    case 'pendiente': return 'Pendiente';
    default: return status;
  }
}
