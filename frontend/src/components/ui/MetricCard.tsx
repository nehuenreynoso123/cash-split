import { type ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  iconColor?: string;
  trend?: { label: string; direction: 'up' | 'down'; color?: string };
  variant?: 'default' | 'primary';
  children?: ReactNode;
}

export default function MetricCard({
  title,
  value,
  icon,
  iconColor = 'text-secondary',
  trend,
  variant = 'default',
  children,
}: MetricCardProps) {
  const bg = variant === 'primary' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant';
  const labelColor = variant === 'primary' ? 'text-primary-fixed' : 'text-on-surface-variant';
  const valueColor = variant === 'primary' ? 'text-on-primary' : 'text-primary';

  return (
    <div className={`${bg} rounded-xl p-stack_lg ${variant === 'default' ? 'border' : ''} overflow-hidden min-w-0`}>
      <div className="flex items-center justify-between mb-2 min-w-0">
        <span className={`font-label-caps text-label-caps ${labelColor} uppercase tracking-wider truncate`}>
          {title}
        </span>
        <span className={`material-symbols-outlined ${iconColor} shrink-0`}>{icon}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`font-data-mono text-display-lg ${valueColor} break-all leading-tight`}>{value}</span>
        {trend && (
          <span className={`text-xs font-bold mt-1 flex items-center gap-1 ${trend.color || (trend.direction === 'up' ? 'text-green-600' : 'text-red-600')}`}>
            <span className="material-symbols-outlined text-xs">
              {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
            {trend.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
