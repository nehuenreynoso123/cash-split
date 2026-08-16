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
  // ventas_facturacion: the fresh shape carries NO column-level UNIQUE — the
  // per-name, case-insensitive guarantee is the functional index
  // (lower(nombre_factura), nro_factura) created below. Pre-existing tables
  // were numbered by a GLOBAL sequence and had a global UNIQUE on nro_factura;
  // those must be migrated (below) so each name can number its own invoices
  // from its own base (almendra → 202, nehuen → 8, any other → 1).
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
    nro_factura INTEGER NOT NULL,
    fecha_factura DATE NOT NULL,
    codigo_postal VARCHAR(20),
    localidad VARCHAR(100),
    provincia VARCHAR(100),
    dni_cuit VARCHAR(50),
    nombre_apellido VARCHAR(200),
    nombre_factura VARCHAR(100) NOT NULL,
    link VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  // Backfill nombre_factura on pre-existing tables: their rows were numbered
  // by the global sequence (202+), so they all belong to the Almendra base.
  // The DEFAULT only exists for the backfill — new rows must say who the
  // invoice is for, so it is dropped right after.
  "ALTER TABLE ventas_facturacion ADD COLUMN IF NOT EXISTS nombre_factura VARCHAR(100) NOT NULL DEFAULT 'Almendra'",
  "ALTER TABLE ventas_facturacion ALTER COLUMN nombre_factura DROP DEFAULT",
  // nro_factura is now computed per name in store.js (advisory-lock MAX+1) —
  // the sequence default must go so the store owns the number.
  "ALTER TABLE ventas_facturacion ALTER COLUMN nro_factura DROP DEFAULT",
  "DROP SEQUENCE IF EXISTS ventas_facturacion_nro_factura_seq",
  // Global uniqueness of nro_factura is replaced by per-name uniqueness.
  // Without dropping it, Nehuen's numbering (8, 9, ...) would collide with
  // Almendra's 202+ the moment it catches up. The global guarantee was created
  // either as a column-level UNIQUE constraint or as the idempotent index
  // below (previous migrate version) — drop whichever exists, both no-op on
  // fresh tables.
  "ALTER TABLE ventas_facturacion DROP CONSTRAINT IF EXISTS ventas_facturacion_nro_factura_key",
  "DROP INDEX IF EXISTS ventas_facturacion_nro_factura_key",
  // Per-name, CASE-INSENSITIVE guarantee. The series is keyed on
  // lower(nombre_factura) in store.js (advisory lock + MAX+1 query) and the
  // controller's base lookup folds case too — so the unique index must fold
  // the same way, or "Almendra"/"ALMENDRA" would start two parallel series
  // and both claim 202. The previous migrate created an exact-case index with
  // this name, and old init.sql versions created a column-level UNIQUE
  // constraint with the same name; an index backing a constraint cannot be
  // dropped directly, so the constraint goes first, then any bare index.
  // Fresh tables have neither. Backfilled rows are all (Almendra,
  // globally-unique nro), so the functional index can never fail to build.
  "ALTER TABLE ventas_facturacion DROP CONSTRAINT IF EXISTS ventas_facturacion_nombre_nro_key",
  "DROP INDEX IF EXISTS ventas_facturacion_nombre_nro_key",
  `DO $$
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS ventas_facturacion_nombre_nro_key
      ON ventas_facturacion (lower(nombre_factura), nro_factura);
  END $$`,
  // Manual ID de venta (numero): user-typed label stored as TEXT. NULL means
  // "auto-derive V-#### from the row id in the store SELECT", so the partial
  // unique index below only guards manually-entered values — unlimited NULLs
  // are allowed while duplicates of a typed value become impossible. The
  // pre-check in store.js turns the raw index violation into a user-safe 409.
  "ALTER TABLE ventas_facturacion ADD COLUMN IF NOT EXISTS numero TEXT",
  `CREATE UNIQUE INDEX IF NOT EXISTS ventas_facturacion_numero_key
    ON ventas_facturacion (numero) WHERE numero IS NOT NULL`,
  // Clientes de la app de TV (sección /lumix del frontend). contrasena is
  // stored as plaintext per user request (always visible in the UI); whatsapp
  // and dueno are optional. Recreated idempotently for DBs that were
  // initialized before this feature shipped.
  `CREATE TABLE IF NOT EXISTS clientes_lumix (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    contrasena VARCHAR(100) NOT NULL,
    vencimiento DATE NOT NULL,
    nombre_cliente VARCHAR(200) NOT NULL,
    whatsapp VARCHAR(30),
    dueno VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
];

export async function runMigrations() {
  for (const statement of MIGRATIONS) {
    await sql.unsafe(statement);
  }
}
