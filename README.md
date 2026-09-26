# K'Plan · Portal

Portal web de K'Plan para **negocios**, **alcaldías** y el **equipo de K'Plan**. Los turistas y los guías usan la app móvil (`../mobile`).

## Qué hace

- **Agenda**: a qué hora llegan los turistas según su itinerario (por día, semana o mes), quién llegó escaneando el QR y por qué otros no llegaron.
- **Lugares**: la ficha de cada parada tal como la ve el turista, con vista previa de la app, mapa, qué ofrecemos, servicios y contacto, novedades y el cartel con el código QR.
- **Cupones**: se pagan con insignias; el negocio los valida con el código del turista y K'Plan cobra una tarifa fija por canje.
- **Eventos**: mini eventos de negocios, talleres y charlas de alcaldías, eventos especiales de K'Plan.
- **Insignias**: activar la insignia de un lugar y campañas de ×2, ×3 o ×5 insignias por visita.
- **Pagos**: estado de cuenta mensual con cada cargo explicado.
- **Admin**: organizaciones (aprobar, suspender), lugares, cupones, eventos, cobros y tarifas.

## Stack

- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/) 8
- [Tailwind CSS](https://tailwindcss.com/) 4: sin `tailwind.config.js`, el tema está en `src/styles/theme.css`
- [React Router](https://reactrouter.com/) 8 (rutas y guardas por rol) y [TanStack Query](https://tanstack.com/query) (datos y caché)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/): los mismos esquemas validan los formularios y el backend de demo
- [MapLibre](https://maplibre.org/) con OpenFreeMap (el mismo proveedor de mapas que la app), `qrcode`, `lucide-react`
- [Vitest](https://vitest.dev/) y [Oxlint](https://oxc.rs/)

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0`

## Desarrollo

```bash
npm install
npm run dev
```

La app queda disponible en http://localhost:5173. En modo demo, la pantalla de entrada muestra las cuentas de prueba (negocios, alcaldías y admin): cualquier contraseña sirve.

## Datos: modo demo y API real

Las pantallas nunca saben de dónde vienen los datos:

```text
pantalla → hook (src/data/hooks) → repositorio (src/data/repositories) → cliente HTTP (src/data/api) → API real o backend de demo
```

- **Sin `VITE_API_URL`** (ver `.env.example`), el cliente HTTP manda cada petición al backend de demo (`src/data/mock`). Este implementa las mismas rutas de `src/data/api/endpoints.ts` con los JSON de `src/data/mock/json` y guarda los cambios en `localStorage`. El menú "Modo demo" de la barra superior restablece los datos.
- **Con `VITE_API_URL=https://…`** en `.env.local`, las mismas peticiones van a la API con el token Bearer, y el backend de demo ni siquiera se descarga.
- **El contrato con el backend** es `endpoints.ts` (las rutas) más `src/data/models` (el formato JSON, el mismo que lee la app). El cliente acepta respuestas planas o envueltas en `data` / `Data`.

## Estructura

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
  features/      un módulo por sección: auth, dashboard, arrivals (agenda), places, coupons, events, badges, billing, admin
  hooks/         hooks compartidos
  lib/           utilidades puras: formatos, fechas de Managua, horas, planificador de itinerarios (port de la app), QR
  styles/        tokens y estilos base
```

## Colores

Todos los colores viven en un solo bloque de `src/styles/theme.css`, espejo de `mobile/lib/src/core/theme/app_colors.dart`: cambiar un color es cambiar una línea ahí (y en la app). Los componentes sólo usan roles como `bg-canvas`, `text-ink`, `bg-brand` o `bg-planned`; Tailwind no tiene otros colores disponibles. El sistema visual completo está en `DESIGN.md`.

## Scripts

- `npm run dev`: servidor de desarrollo con recarga en caliente (HMR).
- `npm run build`: verifica los tipos y genera el build de producción en `dist/`.
- `npm run typecheck`: sólo verifica los tipos.
- `npm run lint`: revisa el código con Oxlint.
- `npm run test`: corre las pruebas (formatos, horas, planificador de itinerarios y agenda).
- `npm run preview`: sirve localmente el build de producción.
