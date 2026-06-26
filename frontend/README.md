# Cash Split

Frontend de gestión financiera para comercios — seguí tus ventas, productos, deudores, gastos e inversiones en un solo panel.

Construido con **Astro + React + Tailwind CSS**. Estático, desplegable en cualquier hosting o contenedor Docker.

## Stack

| Capa        | Tecnología                                          |
| ----------- | --------------------------------------------------- |
| Framework   | [Astro](https://astro.build) 5 + [React](https://react.dev) 19 |
| Estilos     | [Tailwind CSS](https://tailwindcss.com) 3           |
| Tipografía  | Inter + JetBrains Mono (via Fontsource)             |
| Build       | Static Site Generation (`output: 'static'`)         |

## Módulos

- **Dashboard** — resumen general con métricas clave
- **Productos** — gestión de catálogo y precios
- **Ventas** — registro e historial de ventas
- **Deudores** — control de cuentas corrientes
- **Gastos** — registro de gastos operativos
- **Inversión** — seguimiento de inversiones
- **Reposición de Stock** — alertas y control
- **Calculadora** — utilidades auxiliares
- **Login** — pantalla de autenticación (UI)

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo (http://localhost:4321)
pnpm dev

# Compilar para producción
pnpm build

# Previsualizar el build
pnpm preview
```

## Docker

```bash
# Build de la imagen
docker build -t cash-split .

# Correr el contenedor (localhost:8080)
docker run -p 8080:80 cash-split
```

La imagen multi-stage pesa ~25 MB (nginx + assets compilados, sin Node).

## API

La app consume una API REST. Configurá la URL base con la variable de entorno `PUBLIC_API_URL` en el build o a través del archivo `src/lib/api.ts`.

## Licencia

Uso privado — proyecto interno.
