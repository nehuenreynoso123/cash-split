-- =============================================================================
--  cash-split — Inicialización de tablas
--  Ejecutar al levantar la DB por primera vez:
--    cat store/init.sql | docker compose exec -T postgres psql -U user -d cash_db
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    fecha_carga DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT true
);

-- Migración: agregar fecha_carga a productos (si la tabla ya existe)
-- Backfill semantics: existing rows are stamped with CURRENT_DATE, so legacy
-- products start at 0 days in stock.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_carga DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE productos ALTER COLUMN fecha_carga TYPE DATE USING fecha_carga::date;

CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    ganancia NUMERIC(10,2) NOT NULL DEFAULT 0,
    fecha_cobro DATE,
    factura_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Facturación de ventas (sección /facturacion del frontend).
-- `numero` (V-0001...) es el ID de venta: si el usuario tipeó uno se guarda en
-- la columna `numero`; si está NULL la query lo deriva del id ('V-' || LPAD...)
-- vía COALESCE — las filas viejas siguen mostrando el derivado. `nro_factura`
-- se calcula POR NOMBRE en store.js: cada nombre numera sus propias facturas
-- desde su base (Almendra desde 202, Nehuen desde 8, cualquier otro desde 1)
-- dentro de una transacción con advisory lock — MAX+1 por nombre, seguro bajo
-- escrituras concurrentes del mismo nombre. La serie se keyea en
-- lower(nombre_factura) (mismo casing que el lookup de bases y el índice
-- único), así "Almendra" y "ALMENDRA" son UNA sola serie.
-- UNICIDAD: no hay CONSTRAINT a nivel columna; el índice único funcional
-- (lower(nombre_factura), nro_factura) y el parcial sobre `numero` (solo
-- valores manuales, los NULL no chocan) se crean en migrate.js en cada boot
-- (única fuente de las garantías, antes de que sirvan las rutas).
CREATE TABLE IF NOT EXISTS ventas_facturacion (
    id SERIAL PRIMARY KEY,
    numero TEXT,
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
);

CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidez (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'ingreso',
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deudores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    monto NUMERIC(10,2) NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migración: agregar fecha_cobro a ventas (si la tabla ya existe)
-- ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_cobro DATE;

-- Clientes de la app de TV (sección /lumix del frontend).
-- `contrasena` se guarda tal cual (texto plano) por decisión del usuario: la
-- UI siempre la muestra. `whatsapp` y `dueno` son opcionales. `precio` es
-- opcional (NUMERIC nullable): las filas cargadas antes de esta columna no
-- tienen precio y la UI muestra '—' hasta que se les cargue uno.
CREATE TABLE IF NOT EXISTS clientes_lumix (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    contrasena VARCHAR(100) NOT NULL,
    vencimiento DATE NOT NULL,
    nombre_cliente VARCHAR(200) NOT NULL,
    whatsapp VARCHAR(30),
    dueno VARCHAR(100),
    precio NUMERIC(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migración: agregar precio a clientes_lumix (si la tabla ya existe).
-- Idempotente, mismo patrón que fecha_carga en productos: no-op si la columna
-- ya existe, para que la tabla se cree igual en bases nuevas y viejas.
ALTER TABLE clientes_lumix ADD COLUMN IF NOT EXISTS precio NUMERIC(10,2);

-- settings: almacén chico clave/valor para configuraciones editables desde la
-- UI. Hoy guarda el template del mensaje de renovación de WhatsApp. El seed del
-- valor por defecto vive en store/migrate.js (que corre en cada boot, incluido
-- el primer arranque sobre una base recién creada) — no duplicar el string acá.
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
