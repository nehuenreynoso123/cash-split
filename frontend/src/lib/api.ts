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

export async function signout(): Promise<void> {
  const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';
  try {
    await fetch(`${API_BASE}/signout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { /* cookie may already be gone */ }
  clearUser();
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
  fecha_cobro?: string | null;
}

export async function listVentas(): Promise<Venta[]> {
  const data = await request<Venta[]>('GET', '/venta');
  return data.map((v) => ({ ...v, precio: Number(v.precio) }));
}

export async function createVenta(data: { nombre: string; precio: number; product_id: number; cantidad: number; fecha_cobro?: string | null }): Promise<void> {
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

export async function getTotalCajas(params?: { desde?: string; hasta?: string }): Promise<TotalCaja[]> {
  const query = params
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_, v]) => v))).toString()
    : '';
  const data = await request<TotalCaja[]>('GET', `/total-cajas${query}`);
  return data.map((t) => ({
    ...t,
    costo_invertido_stock: Number(t.costo_invertido_stock),
    ingresos_totales: Number(t.ingresos_totales),
    costo_reposicion_total: Number(t.costo_reposicion_total),
    ganancia_real_total: Number(t.ganancia_real_total),
  }));
}

// ── Flujo de Fondos ────────────────────────────────────────────
export async function getFlujoFondos(params?: { desde?: string; hasta?: string }): Promise<TotalCaja[]> {
  const query = params
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_, v]) => v))).toString()
    : '';
  const data = await request<TotalCaja[]>('GET', `/flujo-fondos${query}`);
  return data.map((t) => ({
    ...t,
    costo_invertido_stock: Number(t.costo_invertido_stock),
    ingresos_totales: Number(t.ingresos_totales),
    costo_reposicion_total: Number(t.costo_reposicion_total),
    ganancia_real_total: Number(t.ganancia_real_total),
  }));
}

// ── Liquidez ───────────────────────────────────────────────────
export interface Liquidez {
  id: number;
  descripcion: string;
  monto: number;
  tipo: string;
  fecha: string;
}

export interface LiquidezResponse {
  data: Liquidez[];
  total: number;
}

export async function listLiquidez(params?: { desde?: string; hasta?: string }): Promise<Liquidez[]> {
  const query = params
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_, v]) => v))).toString()
    : '';
  const data = await request<Liquidez>('GET', `/liquidez${query}`);
  // El endpoint ahora devuelve { data, total }, pero listLiquidez extrae data
  if (Array.isArray(data)) {
    return data.map((l) => ({ ...l, monto: Number(l.monto) }));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp = data as unknown as LiquidezResponse;
  return resp.data.map((l) => ({ ...l, monto: Number(l.monto) }));
}

export async function getLiquidezTotal(params?: { desde?: string; hasta?: string }): Promise<number> {
  const query = params
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_, v]) => v))).toString()
    : '';
  const data = await request<LiquidezResponse>('GET', `/liquidez${query}`);
  return Number(data.total);
}

export async function createLiquidez(data: { descripcion: string; monto: number; tipo: string }): Promise<void> {
  return request<void>('POST', '/liquidez', data);
}

export async function updateLiquidez(data: { id: number; descripcion: string; monto: number; tipo: string }): Promise<void> {
  return request<void>('PUT', '/liquidez', data);
}

export async function deleteLiquidez(id: number): Promise<void> {
  return request<void>('DELETE', `/liquidez/${id}`);
}

// ── Gastos ─────────────────────────────────────────────────────
export interface Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
}

export async function listGastos(params?: { desde?: string; hasta?: string }): Promise<Gasto[]> {
  const query = params
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_, v]) => v))).toString()
    : '';
  const data = await request<Gasto[]>('GET', `/gastos${query}`);
  return data.map((g) => ({ ...g, monto: Number(g.monto) }));
}

export async function createGasto(data: { descripcion: string; monto: number }): Promise<void> {
  return request<void>('POST', '/gastos', data);
}

export async function updateGasto(data: { id: number; descripcion: string; monto: number }): Promise<void> {
  return request<void>('PUT', '/gastos', data);
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


