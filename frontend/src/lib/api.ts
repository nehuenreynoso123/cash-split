const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

// ── Response envelope ──────────────────────────────────────────
interface ApiResponse<T> {
  error: boolean;
  status: number;
  body: T;
}

// ── Session management ─────────────────────────────────────────
export function isAuthenticated(): boolean {
  return !!getStoredUser();
}

export function clearUser(): void {
  localStorage.removeItem('cs_user');
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cs_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Generic request helper ─────────────────────────────────────
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data: ApiResponse<T> = await res.json();

  if (data.error) {
    const message = typeof data.body === 'string' ? data.body : 'Error en la solicitud';
    throw new Error(message);
  }

  return data.body;
}

// ── Auth ───────────────────────────────────────────────────────
export interface User {
  id: number;
  nombre: string;
  email: string;
}

export interface AuthResult {
  user: User;
}

export async function signin(email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('POST', '/signin', { email, password });
  localStorage.setItem('cs_user', JSON.stringify(result.user));
  return result;
}

export async function signup(nombre: string, email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('POST', '/signup', { nombre, email, password });
  localStorage.setItem('cs_user', JSON.stringify(result.user));
  return result;
}

// ── Productos ──────────────────────────────────────────────────
export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
}

export async function listProductos(): Promise<Producto[]> {
  const data = await request<Producto[]>('GET', '/producto');
  return data.map((p) => ({ ...p, precio: Number(p.precio) }));
}

export async function createProducto(data: { nombre: string; precio: number; stock: number }): Promise<void> {
  return request<void>('POST', '/producto', data);
}

export async function updateProducto(data: { id: number; nombre: string; precio: number; stock: number }): Promise<void> {
  return request<void>('PUT', '/producto', data);
}

export async function deleteProducto(id: number): Promise<void> {
  return request<void>('DELETE', `/producto/${id}`);
}

// ── Ventas ─────────────────────────────────────────────────────
export interface Venta {
  id: number;
  nombre: string;
  precio: number;
  producto_id: number;
  cantidad: number;
  fecha: string;
  ganancia?: number;
}

export async function listVentas(): Promise<Venta[]> {
  const data = await request<Venta[]>('GET', '/venta');
  return data.map((v) => ({ ...v, precio: Number(v.precio) }));
}

export async function createVenta(data: { nombre: string; precio: number; product_id: number; cantidad: number }): Promise<void> {
  return request<void>('POST', '/venta', data);
}

export async function deleteVenta(id: number): Promise<void> {
  return request<void>('DELETE', `/venta/${id}`);
}

// ── Dashboard ──────────────────────────────────────────────────
export interface TotalCaja {
  producto_id: number;
  producto: string;
  costo_invertido_stock: number;
  unidades_vendidas: number;
  ingresos_totales: number;
  costo_reposicion_total: number;
  ganancia_real_total: number;
}

export async function getTotalCajas(): Promise<TotalCaja[]> {
  const data = await request<TotalCaja[]>('GET', '/total-cajas');
  return data.map((t) => ({
    ...t,
    costo_invertido_stock: Number(t.costo_invertido_stock),
    ingresos_totales: Number(t.ingresos_totales),
    costo_reposicion_total: Number(t.costo_reposicion_total),
    ganancia_real_total: Number(t.ganancia_real_total),
  }));
}

// ── Inversión ──────────────────────────────────────────────────
export interface Inversion {
  id: number;
  nombre: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

export async function listInversiones(): Promise<Inversion[]> {
  const data = await request<Inversion[]>('GET', '/inversion');
  return data.map((i) => ({ ...i, monto: Number(i.monto) }));
}

export async function createInversion(data: { nombre: string; descripcion: string; monto: number }): Promise<void> {
  return request<void>('POST', '/inversion', data);
}

// ── Gastos ─────────────────────────────────────────────────────
export interface Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
}

export async function listGastos(): Promise<Gasto[]> {
  const data = await request<Gasto[]>('GET', '/gastos');
  return data.map((g) => ({ ...g, monto: Number(g.monto) }));
}

export async function createGasto(data: { descripcion: string; monto: number }): Promise<void> {
  return request<void>('POST', '/gastos', data);
}

// ── Deudores ───────────────────────────────────────────────────
export interface Deudor {
  id: number;
  nombre: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

export async function listDeudores(): Promise<Deudor[]> {
  const data = await request<Deudor[]>('GET', '/deudores');
  return data.map((d) => ({ ...d, monto: Number(d.monto) }));
}

export async function createDeudor(data: { nombre: string; descripcion: string; monto: number }): Promise<void> {
  return request<void>('POST', '/deudores', data);
}

// ── Reposición Stock ──────────────────────────────────────────
export interface ReposicionStock {
  id: number;
  nombre: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

export async function listReposiciones(): Promise<ReposicionStock[]> {
  const data = await request<ReposicionStock[]>('GET', '/reposicion-stock');
  return data.map((r) => ({ ...r, monto: Number(r.monto) }));
}

export async function createReposicion(data: { nombre: string; descripcion: string; monto: number }): Promise<void> {
  return request<void>('POST', '/reposicion-stock', data);
}
