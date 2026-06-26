export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  icon: string;
  status: 'disponible' | 'stock_bajo' | 'agotado';
}

export interface Sale {
  id: string;
  date: string;
  time: string;
  product: string;
  quantity: number;
  total: number;
  status: 'pagado' | 'pendiente';
}

export interface DashboardMetrics {
  totalInversion: number;
  totalGastos: number;
  liquidezDisponible: number;
  saludCartera: number;
  rendimiento: number;
  controlGastos: number;
  retornoInversion: number;
}

export const defaultProducts: Product[] = [
  { id: 1, name: 'MacBook Pro M2 14"', category: 'Electrónica', price: 1999.0, stock: 24, icon: 'laptop_mac', status: 'disponible' },
  { id: 2, name: 'Sony WH-1000XM5', category: 'Audio', price: 349.5, stock: 12, icon: 'headphones', status: 'disponible' },
  { id: 3, name: 'iPhone 15 Pro Max', category: 'Electrónica', price: 1199.0, stock: 2, icon: 'smartphone', status: 'stock_bajo' },
  { id: 4, name: 'Monitor Dell UltraSharp 27"', category: 'Hardware', price: 589.0, stock: 8, icon: 'monitor', status: 'disponible' },
  { id: 5, name: 'Teclado Mecánico RGB', category: 'Oficina', price: 45.0, stock: 120, icon: 'keyboard', status: 'disponible' },
  { id: 6, name: 'Mouse Ergonómico', category: 'Oficina', price: 15.5, stock: 12, icon: 'mouse', status: 'disponible' },
  { id: 7, name: 'Monitor 4K UHD 32"', category: 'Hardware', price: 250.0, stock: 4, icon: 'monitor', status: 'stock_bajo' },
  { id: 8, name: 'Cámara Web 4K', category: 'Electrónica', price: 129.0, stock: 0, icon: 'videocam', status: 'agotado' },
];

export const defaultSales: Sale[] = [
  { id: 'VNT-9402', date: '14 Oct, 2023', time: '14:32 PM', product: 'Laptop Pro M2', quantity: 1, total: 1200.0, status: 'pagado' },
  { id: 'VNT-9401', date: '14 Oct, 2023', time: '12:15 PM', product: 'Mouse Ergonómico', quantity: 2, total: 31.0, status: 'pagado' },
  { id: 'VNT-9400', date: '13 Oct, 2023', time: '17:45 PM', product: 'Monitor 4K UHD', quantity: 1, total: 250.0, status: 'pendiente' },
  { id: 'VNT-9399', date: '13 Oct, 2023', time: '09:12 AM', product: 'Teclado Mecánico', quantity: 1, total: 45.0, status: 'pagado' },
  { id: 'VNT-9398', date: '12 Oct, 2023', time: '15:00 PM', product: 'Mouse Ergonómico', quantity: 1, total: 15.5, status: 'pagado' },
];

export const defaultMetrics: DashboardMetrics = {
  totalInversion: 4_250_000,
  totalGastos: 1_120_450,
  liquidezDisponible: 3_129_550,
  saludCartera: 18,
  rendimiento: 94,
  controlGastos: 82,
  retornoInversion: 18.5,
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}
