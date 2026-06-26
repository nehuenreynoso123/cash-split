import { useState, useEffect } from 'react';

interface SidebarProps {
  currentPage: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard/' },
  { id: 'productos', label: 'Productos', icon: 'inventory_2', href: '/productos/' },
  { id: 'ventas', label: 'Ventas', icon: 'payments', href: '/ventas/' },
  { id: 'inversion', label: 'Inversión', icon: 'trending_up', href: '/inversion' },
  { id: 'gastos', label: 'Gastos', icon: 'receipt_long', href: '/gastos' },
  { id: 'deudores', label: 'Deudores', icon: 'group_remove', href: '/deudores' },
  { id: 'reposicion', label: 'Reposición Stock', icon: 'inventory', href: '/reposicion-stock' },
  { id: 'calculadora', label: 'Calculadora', icon: 'calculate', href: '/calculadora' },
];

export default function Sidebar({ currentPage }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '72px' : '260px'
    );
  }, [collapsed]);

  return (
    <aside
      className={`fixed left-0 top-0 h-full ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      } bg-primary flex flex-col py-8 px-4 z-50 transition-all duration-300`}
    >
      {/* Logo + Toggle */}
      <div
        className={`mb-10 flex ${
          collapsed
            ? 'flex-col items-center gap-4'
            : 'items-start justify-between px-3'
        }`}
      >
        {collapsed ? (
          <h1 className="font-display-lg text-display-lg font-bold text-on-primary">
            CS
          </h1>
        ) : (
          <div>
            <h1 className="font-display-lg text-display-lg font-bold text-on-primary">
              cash_split
            </h1>
            <p className="text-on-primary-container font-body-sm mt-1 opacity-80">
              Capital Management
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-on-primary-container hover:text-on-primary transition-colors p-1 rounded-lg hover:bg-primary-container"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <span className="material-symbols-outlined">
            {collapsed ? 'menu' : 'menu_open'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3 px-3'
            } p-3 rounded-xl transition-all duration-200 active:scale-95 ${
              currentPage === item.id
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-primary-container hover:bg-primary-container'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {!collapsed && <span className="font-body-base">{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Bottom section */}
      {collapsed ? (
        <div className="mt-auto border-t border-primary-container pt-4 flex justify-center">
          <a
            href="#"
            className="text-on-primary-container p-3 hover:bg-primary-container transition-colors rounded-xl"
          >
            <span className="material-symbols-outlined">settings</span>
          </a>
        </div>
      ) : (
        <div className="mt-auto border-t border-primary-container pt-4">
          <a
            href="#"
            className="flex items-center gap-3 text-on-primary-container p-3 hover:bg-primary-container transition-colors rounded-xl"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-base">Ajustes</span>
          </a>
          <div className="mt-4 flex items-center gap-3 px-3">
            <img
              alt="Perfil"
              className="w-8 h-8 rounded-full border border-primary-container"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZHjE0OCqUjpnNCJzRPaKPutj4QSdkNrC2PF8tpQFc2ySs7a_pDJcQpUT2CGtYbRxEohBWFU_P2VozDcXQxe4YJtyu-Giclm2TnV2mo7Teh3bni2IIVpGng7R87sF6eKAmAFzJ6j94w3pAdRS6v90cm96PVVAoZ1xU_BjKIqVVVFND73OCA9qmh9_Qay_J_BvSW3e0CmTLPIPHX5gXlh48UTDnGPFUUwnih7BYwufQfcZWKOGBHrcD2e2JZcPosgAAD4E-H6159DY"
            />
            <div className="overflow-hidden">
              <p className="text-on-primary font-bold truncate text-body-sm">
                Admin Liquidity
              </p>
              <p className="text-on-primary-container text-xs opacity-60">
                Corporate
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
