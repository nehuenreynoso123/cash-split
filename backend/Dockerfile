# =============================================================================
#  cash-split — Express API
#  Multi-stage build: pnpm install → tsx dev/prod
# =============================================================================

# -----------------------------------------------------------------------------
#  STAGE 1 — deps
#  Propósito: instalar dependencias con pnpm
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Solo los archivos de dependencias (caché de Docker)
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
#  STAGE 2 — runner
#  Propósito: imagen final con el código y las deps instaladas
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Corepack para pnpm (necesario para el CMD)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copiar dependencias ya instaladas
COPY --from=deps /app/node_modules /app/node_modules

# Copiar el código fuente
COPY . .

# Puerto de la API
EXPOSE 3000

# Dev: arranca con tsx watch para hot-reload.
# En compose se puede override con docker-compose.override.yml o CMD.
CMD ["pnpm", "run", "api:dev"]
