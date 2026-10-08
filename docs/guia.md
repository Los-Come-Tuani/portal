---
icon: lucide/play
---

# Guía de desarrollo

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0`

## Clonar e instalar

```bash
git clone git@github.com:Los-Come-Tuani/portal.git kplan-portal
cd kplan-portal
npm install
```

## Levantar el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en <http://localhost:5173>. En modo demo, la pantalla de entrada muestra las cuentas de prueba (negocios, alcaldías y varias personas del equipo con roles distintos): cualquier contraseña sirve.

## Datos: modo demo y API real

Las pantallas nunca saben de dónde vienen los datos:

```text
pantalla → hook (src/data/hooks) → repositorio (src/data/repositories) → cliente HTTP (src/data/api) → API real o backend de demo
```

- **Sin `VITE_API_URL`** (ver `.env.example`), el cliente HTTP manda cada petición al backend de demo (`src/data/mock`). Este implementa las mismas rutas de `src/data/api/endpoints.ts` con los JSON de `src/data/mock/json` y guarda los cambios en `localStorage`. El menú "Modo demo" de la barra superior restablece los datos.
- **Con `VITE_API_URL=https://…`** en `.env.local`, las mismas peticiones van a la API con el token Bearer, y el backend de demo ni siquiera se descarga.
- **El contrato con el backend** es `endpoints.ts` (las rutas) más `src/data/models` (el formato JSON, el mismo que lee la app). El cliente acepta respuestas planas o envueltas en `data` / `Data`.

## Estructura del proyecto

```text
src/
  app/           arranque: providers, rutas y guardas por rol, layout (menú lateral y barra superior)
  components/    UI compartida (ui/) y marca (logo, QR)
  config/        variables de entorno
  data/
    api/         cliente HTTP, endpoints y errores
    hooks/       hooks de TanStack Query que usan las pantallas
    models/      tipos: el contrato JSON con la app
    repositories/ una función por endpoint
    schemas/     validaciones Zod (formularios y backend de demo)
    mock/        backend de demo: JSON, generadores de datos y rutas
  features/      un módulo por sección: auth, onboarding (postulación), dashboard, arrivals (agenda), places, coupons,
                 events, badges, billing, admin; verification tiene lo común a toda revisión con documentos
  hooks/         hooks compartidos
  lib/           utilidades puras: formatos, fechas de Managua, horas, planificador de itinerarios (port de la app), QR
  styles/        tokens y estilos base
```

Todos los colores viven en un solo bloque de `src/styles/theme.css`, espejo de `mobile/lib/src/core/theme/app_colors.dart`: cambiar un color es cambiar una línea ahí (y en la app). Los componentes sólo usan roles como `bg-canvas`, `text-ink`, `bg-brand` o `bg-planned`; Tailwind no tiene otros colores disponibles. El sistema visual completo está en [Diseño](diseno/index.md).

## Scripts disponibles

- `npm run dev`: servidor de desarrollo con recarga en caliente (HMR).
- `npm run build`: verifica los tipos y genera el build de producción en `dist/`.
- `npm run typecheck`: sólo verifica los tipos.
- `npm run lint`: revisa el código con Oxlint.
- `npm run test`: corre las pruebas (formatos, horas, planificador de itinerarios y agenda).
- `npm run preview`: sirve localmente el build de producción.

## Servir esta documentación

Este sitio se genera con [Zensical](https://zensical.org/) a partir de `zensical.toml` y `docs/`. Para verlo en local con recarga en caliente:

```bash
uvx zensical serve
```

Para generar el sitio estático:

```bash
uvx zensical build
```

Ambos comandos requieren [`uv`](https://docs.astral.sh/uv/#installation) instalado; no hace falta ningún entorno de Python preparado de antemano.
