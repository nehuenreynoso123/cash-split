# =============================================================================
#  cash-split — Astro static site
#  Multi-stage build: pnpm install → astro build → nginx serve
# =============================================================================
#  ¿Por qué multi-stage?
#  ---------------------
#  La imagen final (runner) solo contiene nginx + los archivos HTML/JS/CSS
#  ya compilados. Node, pnpm, dependencias, código fuente — TODO eso queda
#  en el stage builder y se descarta. La imagen final pesa ~25 MB en vez de
#  ~1.5 GB. Seguridad: no exponés Node ni el src en producción.
# =============================================================================


# =============================================================================
#  STAGE 1 — builder
#  Propósito: compilar el sitio estático con Astro
#  Base: Node 22 sobre Alpine Linux (imagen ~40 MB)
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# ---------------------------------------------------------------------------
# Corepack: herramienta oficial de Node para gestionar package managers.
# Node 22 ya incluye Corepack; solo hay que activarlo.
# Esto evita instalar pnpm globalmente con npm o curl.
# ---------------------------------------------------------------------------
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------------------------------------------------------------------------
# (Opcional) Variables de entorno para el build de Astro.
# Se inyectan desde el CI/CD, no se hardcodean.
# ---------------------------------------------------------------------------
# ARG PUBLIC_API_URL
# ENV PUBLIC_API_URL=$PUBLIC_API_URL

# ---------------------------------------------------------------------------
# 1. Instalar dependencias (layer cache)
# ---------------------------------------------------------------------------
# PRIMERO copiamos solo los archivos de dependencias, ANTES que el código.
# Docker cachea esta capa. Mientras lockfile y package.json no cambien,
# Docker reusa el cache de pnpm install y no descarga nada de nuevo.
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# 2. Copiar fuente y compilar
# ---------------------------------------------------------------------------
# Recién acá copiamos el código fuente. Si solo cambia código (no
# dependencias), Docker usa el cache del paso anterior — build rapidísimo.
COPY . .
RUN pnpm run build   # → genera /app/dist/


# =============================================================================
#  STAGE 2 — runner (nginx)
#  Propósito: servir los archivos estáticos en producción
#  Base: nginx sobre Alpine (~8 MB)
# =============================================================================
FROM nginx:alpine AS runner

# ---------------------------------------------------------------------------
# Copiar configuración custom de nginx
# ---------------------------------------------------------------------------
# /etc/nginx/nginx.conf es el archivo de configuración principal de nginx.
# Reemplazamos el default por el nuestro (con gzip, caché, SPA fallback).
COPY nginx.conf /etc/nginx/nginx.conf

# ---------------------------------------------------------------------------
# Copiar el sitio ya compilado desde el stage builder
# ---------------------------------------------------------------------------
# Solo los archivos HTML/JS/CSS/imágenes generados por Astro.
# Node, pnpm, source code — NO existen en esta imagen.
COPY --from=builder /app/dist /usr/share/nginx/html

# ---------------------------------------------------------------------------
# Puerto que nginx va a escuchar dentro del container
# ---------------------------------------------------------------------------
# NO es el puerto que ves desde el host. Docker mapea:
#   docker run -p 8080:80  →  host:8080 → container:80
# Adentro del container nginx escucha en 80; afuera accedés por 8080.
EXPOSE 80

# ---------------------------------------------------------------------------
# Healthcheck: Docker revisa cada 30s que nginx responda OK
# ---------------------------------------------------------------------------
# Si el healthcheck falla 3 veces seguidas, Docker reinicia el container.
# wget --spider = hace request sin descargar el body.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

# ---------------------------------------------------------------------------
# Arrancar nginx en primer plano
# ---------------------------------------------------------------------------
# "daemon off;" es clave en Docker. Por defecto nginx se "daemoniza" (forkea
# un proceso hijo y el padre termina). Docker espera que el proceso principal
# siga vivo. Con daemon off, nginx se queda en foreground y Docker lo monitorea.
CMD ["nginx", "-g", "daemon off;"]
