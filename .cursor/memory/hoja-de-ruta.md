# Memoria de trabajo: portal y la hoja de ruta del API

Actualizada el 2026-10-06. Traspaso para el siguiente agente. La memoria general (estado de
todas las tareas, API, F2 a F8, avisos y cómo correr el API en esta máquina) está en
`C:\development\kplan\api\.cursor\memory\hoja-de-ruta.md`: léela primero.

Rama de trabajo: `feat/hoja-de-ruta-api` (sale de `main`). No tocar `main`; no empujar sin que
el usuario lo pida. Commits convencionales en español, sin emojis.

## Estado

- **Hecho: F0** (`.gitignore`, gitleaks, entornos explícitos, build de producción seguro).
- **Hecho: `f1-portal-link`**. El portal habla con el API real para todo lo de la cuenta:
  - Cliente HTTP (`src/data/api/http-client.ts`): cookies `HttpOnly` (`credentials: 'include'`),
    CSRF en `X-CSRFToken` (se pide a `/auth/csrf/`, solo en memoria), renovación de sesión única
    ante varios 401 y un reintento, errores `{ detail, field_errors }` -> `ApiError` (nombres
    de formulario en camelCase, `retryAfter`).
  - `session-marker.ts`: una bandera en `localStorage`, nunca un token. Reemplaza a
    `session-token.ts`.
  - `src/data/schemas/session.schema.ts`: el usuario del API -> `SessionUser` del portal.
    `institucion` se trata como `alcaldia` (provisional), `guia` y `traductor` -> `guia`, sin rol
    -> 403 con mensaje. Solo pasan los permisos que están en `models/access.ts`.
  - Pantallas: `LoginPage` (con paso 2FA), `ResetPasswordPage` (`/restablecer`, código de 6
    dígitos), `SecurityPage` (`/seguridad`: 2FA con QR, códigos de recuperación, contraseña,
    cerrar todas las sesiones) y la entrada "Seguridad" en el menú del usuario.
  - Demo: `src/data/mock/handlers/auth.ts` imita todo (el código que sirve es `123456`) con
    `mock/services/demo-session.ts` y `demo-two-factor.ts`.
  - Pruebas: 77 unitarias (`npm test`) y 4 de integración contra un API local
    (`src/data/api/api.integration.test.ts`, ver README). Se verificó además en un navegador
    (Edge, con `playwright-core` desde una carpeta temporal) contra el API real y en demo: entrar,
    recargar, 2FA completo, recuperar contraseña, cerrar sesiones.
- Comprobaciones: `npm run typecheck && npm run lint && npm test && npm run build:demo`.

## Qué falta (depende de otras fases)

1. **F2 (roles y permisos, API primero)**. Hoy el API devuelve como `permissions` los códigos de
   permiso de Django, que el portal ignora, así que el superusuario entra con el mensaje "Tu rol
   todavía no tiene módulos" y un menú vacío. Cuando F2 entregue los IDs funcionales
   (`agenda.view`, `guides.review`...) y el rol interno (`groups`), el menú y las guardas
   funcionan sin cambiar código: `navigationFor` y `RequirePermission` ya usan `can(...)`. Aquí
   habrá que agregar los permisos `*.view` a `src/data/models/access.ts`, usarlos en
   `navigation.ts`/`routes.tsx`, y mostrar `twoFactor.required` (la página de Seguridad ya lo
   considera: oculta "Desactivar" y avisa si el rol lo exige).
2. **F3 en adelante (dominio)**. El resto de `endpoints` (`/api/organizations`, `/api/stops`...)
   no existe en el API: esas pantallas responden 404 con el API real y solo se pueden trabajar en
   demo (`npm run dev:demo`). Al llegar cada fase se alinea su sección de `endpoints.ts`, su
   repositorio y su handler de demo con lo que publique el API (sin prefijo `/api`, con barra final).
   `ApplicationWizard` (postular) usa `acceptSession(response)`: el API real de la solicitud
   (F3) debe dejar la sesión abierta con cookies y devolver `{ user }`.
3. **Google en el portal** (opcional): el API ya acepta `POST /auth/web/google/`; falta el botón con
   Google Identity Services. Solo aplica a roles públicos, así que no sirve para el equipo ni las
   organizaciones: no hay prisa.
4. Decisiones abiertas: cómo distinguir `institucion` de `alcaldia` en el portal (hoy iguales).

## Cómo probar contra el API real en esta máquina

El Postgres portátil y el API local se describen en la memoria del API (sección 10). Resumen:
con el API en `http://localhost:8080` y `npm run dev` (puerto 5173) se entra con el superusuario
del `.env` del API. El script de navegador que usé está fuera del repo, en
`%LOCALAPPDATA%\Temp\kplan-dev\e2e` (`run-e2e.ps1`); si no existe, la prueba de integración de
arriba cubre el contrato.

## Cómo está armado el portal

- `src/data/api/http-client.ts`: `createFetchTransport` (real), transporte de demo (se carga
  bajo demanda) y `createHttpClient` (renovación de sesión). `endpoints.ts` es el contrato.
- `src/data/repositories/*.repository.ts` -> `src/data/hooks/use-*.ts` -> pantallas en
  `src/features/*`. `src/data/mock/*` implementa las mismas rutas para la demo.
- Sesión: `src/features/auth/AuthProvider.tsx` (+ `auth-context.ts`, `use-auth.ts`),
  `src/app/router/guards.tsx` (`RequireAuth`, `RequireRole`, `RequirePermission`).
- Los DTO del API usan snake_case; el portal, camelCase: la traducción vive en los
  repositorios y en `session.schema.ts`, nunca en las pantallas.
