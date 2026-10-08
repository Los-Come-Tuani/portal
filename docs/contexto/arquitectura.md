---
icon: lucide/blocks
---

# Arquitectura sugerida para el portal

Sugerencias; verificar las versiones actuales de cada librería antes de instalar.

- **Rutas**: React Router, con guardas por rol.
- **Datos**: repositorios con la misma interfaz para mock y API, consumidos con TanStack Query. Es el mismo patrón que la app: el día que exista la API sólo cambia el cuerpo de los repositorios, no las pantallas.
- **Modo demo**: si `VITE_API_URL` está vacío, se usan los mocks (igual que `ApiClient.isConfigured` en la app). Los cambios se guardan en `localStorage`, con un botón "Restablecer datos de demo".
- **Formularios**: React Hook Form con Zod, validando los formatos de [Contrato de datos](contrato-datos.md).
- **Mapas**: MapLibre GL (por ejemplo con `react-map-gl`) y **OpenFreeMap**, el mismo proveedor que usa la app: gratis y sin API key. Estilos listos: `https://tiles.openfreemap.org/styles/liberty` o `https://tiles.openfreemap.org/styles/positron`. La app no traza rutas por calles: une las paradas en orden con curvas suaves.
- **Gráficos**: Recharts o similar.
- **QR**: la librería `qrcode` (genera SVG o PNG en el navegador); impresión con CSS `@media print` o PDF.
- **Ordenar paradas**: dnd-kit.
- **Tests**: Vitest, sobre todo para el planificador, los formatos y las métricas.
- **Fechas**: `Intl` o date-fns con locale `es` y zona America/Managua.
- Un solo módulo de formatos (como `formatters.dart`) y una sola fuente de colores (los tokens de Tailwind).

Estructura de carpetas sugerida (documento original de planificación, previo a la implementación actual — ver la estructura real en la [Guía de desarrollo](../guia.md)):

```text
src/
  app/            router, providers, layout (menú lateral y barra superior), guardas por rol
  core/           formatos (C$, fechas, horas), lector de horas y duraciones, planificador, QR
  data/
    models/       tipos del contrato de datos
    mocks/        JSON copiados de la app, organizations.json y generador de eventos de visita
    repositories/ paradas, circuitos, eventos, cupones, analítica… (mock hoy, API mañana)
    api/          cliente HTTP con VITE_API_URL y token Bearer
  features/       auth, dashboard, stops, qr, circuits, group-sessions, events, coupons,
                  places, analytics, bookings, guides, settings
  components/     UI compartida: botones, campos, tarjetas, tablas, mapa, gráficos, estados vacíos
```

Mensajes de error iguales a los de la app: "Algo salió mal, intenta de nuevo", "No hay conexión a internet", "Sesión expirada, vuelve a iniciar sesión".

## Identidad visual (plan original)

Fuente de verdad en la app: `lib/src/core/theme/app_colors.dart`, `app_text_styles.dart` y `app_theme.dart`. Esta sección es el plan de tokens previo al rediseño visual del portal; el sistema actualmente implementado vive en [Diseño → Sistema visual](../diseno/index.md).

- Tipografía: **Poppins** en toda la interfaz (400, 500, 600, 700 y 900 para títulos grandes).
- Fondo crema, tinta casi negra y terracota para las acciones principales. Esquinas de 10 px. Tarjetas blancas con borde `#E6E0D0`.
- El dorado `#E0B84C` es el de las medallas y el distintivo de "Circuito creativo".
- Logos (copiar al portal y reemplazar el favicon de Vite): `mobile/assets/images/logo/IsoLogoClaro.svg` (isologo), `LogoTipoClaro.svg` (logotipo) e `ImagoTipoClaro.svg` (imagotipo). "Claro" significa que son para fondos claros.
- Cambiar el título de `index.html` ("KPlan Portal") por uno con el nombre correcto, K'Plan.

Tokens listos para `src/index.css` (Tailwind 4 se configura con `@theme`, sin `tailwind.config.js`):

```css
@import "tailwindcss";

@theme {
  --font-sans: "Poppins", ui-sans-serif, system-ui, sans-serif;

  --color-ink: #1E2022;           /* títulos, textos y bordes fuertes */
  --color-brand: #D95D39;         /* terracota: acciones principales */
  --color-cream: #F8F4E6;         /* fondo general */
  --color-accent-green: #2D6A4F;  /* éxito, gráficas */
  --color-accent-blue: #2F6690;   /* gráficas, estados */
  --color-card: #FFFFFF;
  --color-field: #FDFBF3;         /* relleno de los campos */
  --color-outline: #CFC7B4;       /* borde de los campos */
  --color-divider: #E6E0D0;
  --color-hint: #9A9484;          /* placeholder */
  --color-muted: #5C5C5C;         /* texto secundario */
  --color-danger: #B3261E;
  --color-placeholder: #EDE7D6;   /* fondo de imágenes que no cargan */
  --color-star: #F5A623;          /* calificaciones */
  --color-chip-city: #2B8FD1;
  --color-chip-nature: #0E9AA7;
  --color-chip-culture: #7B5EA7;
  --color-medal-none: #C7C0B0;
  --color-medal-bronze: #B08D57;
  --color-medal-silver: #AEB4BD;
  --color-medal-gold: #E0B84C;    /* también el de "Circuito creativo" */

  --radius-kp: 10px;
}
```

Textos: español, tono cercano y claro (la app tutea al turista).
