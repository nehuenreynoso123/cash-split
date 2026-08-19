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
  localStorage.removeItem('cs_token');
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('cs_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
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
  token: string;
}

export async function signin(email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('POST', '/signin', { email, password });
  localStorage.setItem('cs_user', JSON.stringify(result.user));
  localStorage.setItem('cs_token', result.token);
  return result;
}

export async function signup(nombre: string, email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('POST', '/signup', { nombre, email, password });
  localStorage.setItem('cs_user', JSON.stringify(result.user));
  localStorage.setItem('cs_token', result.token);
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

export interface VentaFacturaItem {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface VentaFactura {
  factura_id: string;
  fecha: string;
  fecha_cobro: string | null;
  cantidad: number;
  precio: number;
  ganancia: number;
  productos: VentaFacturaItem[];
}

export async function listVentasGrouped(): Promise<VentaFactura[]> {
  const data = await request<VentaFactura[]>('GET', '/venta/grouped');
  return data.map((v) => ({ ...v, precio: Number(v.precio), ganancia: Number(v.ganancia) }));
}

export async function createFactura(data: { items: { product_id: number; cantidad: number; precio: number }[]; factura_id: string; fecha_cobro?: string | null }): Promise<void> {
  return request<void>('POST', '/venta/factura', data);
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
// id, nro_factura AND importe (importe is forced from precio_venta server-side
// — the client never sends it). numero (ID de venta) is OPTIONAL: a typed
// value is stored as-is; ''/undefined falls back to the auto V-#### derivation.
export interface VentaFacturacionDraft {
  numero: string;
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
    // undefined keys are dropped by JSON.stringify, so an empty numero is
    // simply absent and the backend falls back to the auto V-####.
    numero: draft.numero.trim() || undefined,
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

export async function deleteVentaFacturacion(id: number): Promise<void> {
  return request<void>('DELETE', `/facturacion-ventas/${id}`);
}

// ── Lumix (clientes de la app de TV) ───────────────────────────
// Backend rows come back snake_case; vencimiento is a date-only string
// (DATE cast to text by the backend, same round-trip as facturación). precio
// is NUMERIC money (string on the wire) and nullable: null means the client
// never had a price set (legacy rows), never a zero price.
export interface LumixCliente {
  id: number;
  usuario: string;
  contrasena: string;
  vencimiento: string; // YYYY-MM-DD
  nombre_cliente: string;
  whatsapp: string | null;
  dueno: string | null; // "Vendedor" in the UI; the backend field/DB column keep the name dueno
  precio: number | null;
  created_at: string;
}

// Draft payload shape (camelCase, same as the form model); the backend assigns
// id and created_at. whatsapp and dueno are OPTIONAL (empty string → NULL);
// precio is optional too (null → NULL, meaning "no price set").
export interface LumixClienteDraft {
  usuario: string;
  contrasena: string;
  vencimiento: string;
  nombreCliente: string;
  whatsapp: string;
  dueno: string;
  precio: number | null;
}

// NUMERIC money comes back as a string (same wire shape as productos/ventas);
// normalize to number, keeping null so the UI can tell "no price set" apart
// from a zero price.
function normalizeLumixCliente(c: LumixCliente): LumixCliente {
  return { ...c, precio: c.precio == null ? null : Number(c.precio) };
}

export async function listLumixClientes(): Promise<LumixCliente[]> {
  const data = await request<LumixCliente[]>('GET', '/lumix-clientes');
  return data.map(normalizeLumixCliente);
}

export async function createLumixCliente(draft: LumixClienteDraft): Promise<LumixCliente> {
  return normalizeLumixCliente(
    await request<LumixCliente>('POST', '/lumix-clientes', {
      usuario: draft.usuario,
      contrasena: draft.contrasena,
      vencimiento: draft.vencimiento,
      nombre_cliente: draft.nombreCliente,
      whatsapp: draft.whatsapp,
      dueno: draft.dueno,
      precio: draft.precio,
    }),
  );
}

export async function deleteLumixCliente(id: number): Promise<void> {
  return request<void>('DELETE', `/lumix-clientes/${id}`);
}

// Renews a client's subscription: the backend computes the new vencimiento
// server-side (current vencimiento + meses, clamped to the destination month's
// last day) and returns the updated row.
export async function renovarLumixCliente(id: number, meses: number): Promise<LumixCliente> {
  return normalizeLumixCliente(
    await request<LumixCliente>('PUT', `/lumix-clientes/${id}/renovar`, { meses }),
  );
}

// Directly overwrites a client's vencimiento; returns the updated row.
export async function updateLumixClienteVencimiento(id: number, vencimiento: string): Promise<LumixCliente> {
  return normalizeLumixCliente(
    await request<LumixCliente>('PUT', `/lumix-clientes/${id}/vencimiento`, { vencimiento }),
  );
}

// Directly overwrites a client's precio (null clears it); returns the updated
// row.
export async function updateLumixClientePrecio(id: number, precio: number | null): Promise<LumixCliente> {
  return normalizeLumixCliente(
    await request<LumixCliente>('PUT', `/lumix-clientes/${id}/precio`, { precio }),
  );
}

// ── Settings ───────────────────────────────────────────────────
// The WhatsApp renewal message template is persisted server-side (settings
// table) so edits survive across browsers; GET falls back to the frontend
// default (frontend/src/lib/lumix.ts) when no row exists yet.
export async function getMensajeRenovacion(): Promise<string> {
  const data = await request<{ mensaje: string }>('GET', '/settings/lumix-mensaje-renovacion');
  return data.mensaje;
}

// Upserts the template and returns the persisted value (trimmed server-side).
export async function updateMensajeRenovacion(mensaje: string): Promise<string> {
  const data = await request<{ mensaje: string }>('PUT', '/settings/lumix-mensaje-renovacion', {
    mensaje,
  });
  return data.mensaje;
}
