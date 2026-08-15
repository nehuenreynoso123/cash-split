const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

// ── Response envelope ──────────────────────────────────────────
interface ApiResponse<T> {
  error: boolean;
  status: number;
  body: T;
}

// ── Shared types ───────────────────────────────────────────────
export interface DateRangeParams {
  desde?: string;
  hasta?: string;
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
  fecha_carga: string;
}

export async function listProductos(): Promise<Producto[]> {
  const data = await request<Producto[]>('GET', '/producto');
  return data.map((p) => ({ ...p, precio: Number(p.precio) }));
}

export async function createProducto(data: { nombre: string; precio: number; stock: number }): Promise<void> {
  return request<void>('POST', '/producto', data);
}

export async function updateProducto(data: { id: number; nombre: string; precio: number; stock: number; fecha_carga?: string }): Promise<void> {
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
  ganancia_por_cobrar_total?: number;
  unidades_por_cobrar?: number;
}

export async function getTotalCajas(params?: DateRangeParams): Promise<TotalCaja[]> {
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
export async function getFlujoFondos(params?: DateRangeParams): Promise<TotalCaja[]> {
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
    ganancia_por_cobrar_total: Number(t.ganancia_por_cobrar_total),
    unidades_por_cobrar: Number(t.unidades_por_cobrar),
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

export async function listLiquidez(params?: DateRangeParams): Promise<Liquidez[]> {
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

export async function getLiquidezTotal(params?: DateRangeParams): Promise<number> {
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

export interface GastosResponse {
  data: Gasto[];
  total: number;
  totalMonto: number;
}

export async function listGastos(params?: { desde?: string; hasta?: string; limit?: number; offset?: number }): Promise<GastosResponse> {
  const query = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  const data = await request<GastosResponse>('GET', `/gastos${query}`);
  return {
    data: Array.isArray(data.data) ? data.data.map((g) => ({ ...g, monto: Number(g.monto) })) : [],
    total: Number(data.total) || 0,
    totalMonto: Number(data.totalMonto) || 0,
  };
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

export async function deleteDeudor(id: number): Promise<void> {
  return request<void>('DELETE', `/deudores/${id}`);
}

// ── Facturación (ventas) ───────────────────────────────────────
// Backend rows come back snake_case with NUMERIC money as strings; the API
// layer normalizes money to numbers and leaves the field mapping to the UI
// (the facturación components work with a camelCase Venta model).
export interface VentaFacturacion {
  id: number;
  numero: string;
  producto: string;
  fecha: string;
  cantidad: number;
  precio_venta: number;
  comision_venta: number;
  comision_cuota: number;
  envio_ml: number;
  envio_flex: number;
  descuento: number;
  retenciones: number;
  total_recibido: number;
  importe: number;
  nro_factura: number;
  fecha_factura: string;
  codigo_postal: string | null;
  localidad: string | null;
  provincia: string | null;
  dni_cuit: string | null;
  nombre_apellido: string | null;
  nombre_factura: string;
  link: string | null;
}

// Draft payload shape (camelCase, same as the form model); the backend assigns
// id, numero, nro_factura AND importe (importe is forced from precio_venta
// server-side — the client never sends it).
export interface VentaFacturacionDraft {
  producto: string;
  fecha: string;
  cantidad: number;
  precioVenta: number;
  comisionVenta: number;
  comisionCuota: number;
  envioML: number;
  envioFlex: number;
  descuento: number;
  retenciones: number;
  totalRecibido: number;
  fechaFactura: string;
  jurisdiccion: { codigoPostal: string; localidad: string; provincia: string };
  dniCuit: string;
  nombreApellido: string;
  nombreFactura: string;
  link: string;
}

const MONEY_FIELDS = [
  'precio_venta',
  'comision_venta',
  'comision_cuota',
  'envio_ml',
  'envio_flex',
  'descuento',
  'retenciones',
  'total_recibido',
  'importe',
] as const;

function normalizeVentaFacturacion(v: VentaFacturacion): VentaFacturacion {
  const row = { ...v };
  for (const field of MONEY_FIELDS) {
    row[field] = Number(v[field]);
  }
  return row;
}

export async function listVentasFacturacion(): Promise<VentaFacturacion[]> {
  const data = await request<VentaFacturacion[]>('GET', '/facturacion-ventas');
  return data.map(normalizeVentaFacturacion);
}

export async function createVentaFacturacion(draft: VentaFacturacionDraft): Promise<VentaFacturacion> {
  const data = await request<VentaFacturacion>('POST', '/facturacion-ventas', {
    producto: draft.producto,
    fecha: draft.fecha,
    cantidad: draft.cantidad,
    precio_venta: draft.precioVenta,
    comision_venta: draft.comisionVenta,
    comision_cuota: draft.comisionCuota,
    envio_ml: draft.envioML,
    envio_flex: draft.envioFlex,
    descuento: draft.descuento,
    retenciones: draft.retenciones,
    total_recibido: draft.totalRecibido,
    fecha_factura: draft.fechaFactura,
    codigo_postal: draft.jurisdiccion.codigoPostal,
    localidad: draft.jurisdiccion.localidad,
    provincia: draft.jurisdiccion.provincia,
    dni_cuit: draft.dniCuit,
    nombre_apellido: draft.nombreApellido,
    nombre_factura: draft.nombreFactura,
    link: draft.link,
  });
  return normalizeVentaFacturacion(data);
}


