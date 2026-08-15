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
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Facturación de ventas (sección /facturacion del frontend).
-- `numero` (V-0001...) se deriva del id en cada query; `nro_factura` (202, 203...)
-- lo provee una secuencia, segura bajo escrituras concurrentes (a diferencia
-- de un MAX+1 calculado en el INSERT).
CREATE SEQUENCE IF NOT EXISTS ventas_facturacion_nro_factura_seq START 202;

CREATE TABLE IF NOT EXISTS ventas_facturacion (
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
