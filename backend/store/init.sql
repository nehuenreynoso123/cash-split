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
    activo BOOLEAN NOT NULL DEFAULT true
);

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
