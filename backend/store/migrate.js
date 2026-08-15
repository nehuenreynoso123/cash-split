import sql from "./database.js";

// Idempotent DDL migrations for already-initialized databases.
// The base schema lives in store/init.sql and only runs when a DB is first
// created — so a pre-existing DB never received the newer columns/tables and
// needs these statements applied on every boot (Vercel cold start included).
//
// - ADD COLUMN IF NOT EXISTS no-ops once the column exists.
// - ALTER COLUMN TYPE DATE USING fecha_carga::date no-ops when it is already
//   DATE, and also converts a DB that got the earlier TIMESTAMP version.
// - CREATE TABLE IF NOT EXISTS no-ops once the table exists.
// - sql.unsafe is required: these are unparameterized DDL statements.
// - If a statement throws, module load fails loudly — the app would be broken
//   anyway without the schema.

const MIGRATIONS = [
  "ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_carga DATE NOT NULL DEFAULT CURRENT_DATE",
  "ALTER TABLE productos ALTER COLUMN fecha_carga TYPE DATE USING fecha_carga::date",
  // nro_factura sequence: concurrency-safe numbering starting at 202. The
  // CREATE TABLE below includes the default for fresh DBs; the ALTER covers
  // tables created before the sequence existed; the setval re-syncs the
  // sequence past rows already inserted with the previous MAX+1 logic.
  "CREATE SEQUENCE IF NOT EXISTS ventas_facturacion_nro_factura_seq START 202",
  `CREATE TABLE IF NOT EXISTS ventas_facturacion (
    id SERIAL PRIMARY KEY,
    producto VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_venta NUMERIC(10,2) NOT NULL,
    comision_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
    comision_cuota NUMERIC(10,2) NOT NULL DEFAULT 0,
    envio_ml NUMERIC(10,2) NOT NULL DEFAULT 0,
    envio_flex NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
    retenciones NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_recibido NUMERIC(10,2) NOT NULL,
    importe NUMERIC(10,2) NOT NULL,
    nro_factura INTEGER NOT NULL UNIQUE DEFAULT nextval('ventas_facturacion_nro_factura_seq'),
    fecha_factura DATE NOT NULL,
    codigo_postal VARCHAR(20),
    localidad VARCHAR(100),
    provincia VARCHAR(100),
    dni_cuit VARCHAR(50),
    nombre_apellido VARCHAR(200),
    link VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  "ALTER TABLE ventas_facturacion ALTER COLUMN nro_factura SET DEFAULT nextval('ventas_facturacion_nro_factura_seq')",
  "SELECT setval('ventas_facturacion_nro_factura_seq', COALESCE((SELECT MAX(nro_factura) FROM ventas_facturacion), 201), true)",
  // Uniqueness of nro_factura: fresh tables get it from the column UNIQUE in
  // the CREATE TABLE above. Postgres has no ADD CONSTRAINT IF NOT EXISTS, so
  // pre-existing tables get the same guarantee via an idempotent unique index
  // (a unique index enforces exactly the same constraint).
  `DO $$
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS ventas_facturacion_nro_factura_key ON ventas_facturacion(nro_factura);
  END $$`,
];

export async function runMigrations() {
  for (const statement of MIGRATIONS) {
    await sql.unsafe(statement);
  }
}
