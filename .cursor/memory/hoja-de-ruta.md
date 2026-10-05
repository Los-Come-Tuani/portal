# Memoria de trabajo: portal y la hoja de ruta del API

Actualizada el 2026-10-05. Traspaso para el siguiente agente. La memoria general (estado de
todas las tareas, API, F2 a F8, avisos y cómo correr el API en esta máquina) está en
`C:\development\kplan\api\.cursor\memory\hoja-de-ruta.md`: léela primero.

Rama de trabajo: `feat/hoja-de-ruta-api` (sale de `main`). No tocar `main`; no empujar sin que
el usuario lo pida. Commits convencionales en español, sin emojis.

## Estado

- **Hecho (F0, `f0-secrets-gitignore` y `f0-env-config`)**:
  - `.gitignore` ignora `.env*` (salvo `.env.example`, `.env.development`, `.env.production`
    y `.env.demo`, que no llevan secretos), llaves y certificados.
  - `.gitleaks.toml` y `.github/workflows/secrets.yml` (escaneo de secretos en CI).
  - `src/config/env.ts`: lanza si falta `VITE_API_URL` y no se pidió el modo demo. El modo
    demo es **explícito**: `VITE_USE_MOCKS=true` (antes, una URL vacía lo activaba en
    silencio, también en producción).
  - `vite.config.ts` (`assertProductionEnv`): `vite build` en modo `production` exige una
    `VITE_API_URL` con `https` y sin mocks. El build falla antes que publicar una demo.
  - `.env.development` (`VITE_API_URL=http://localhost:8080`), `.env.production` (vacío a
    propósito: la URL de producción aún no existe), `.env.demo` (`VITE_USE_MOCKS=true`),
    `.env.example`. Scripts `dev:demo` y `build:demo`.
  - Todo `VITE_*` termina dentro del bundle: aquí solo van valores públicos, nunca claves.
- **Pendiente: `f1-portal-link`**. Está explorado y diseñado (abajo); **no hay código**.
- Comprobaciones que pasaban al cerrar F0: `npm ci`, `npm run typecheck`, `npm run lint`,
  `npm test` (36 pruebas). Con Node 25 hay un aviso `EBADENGINE` de Vitest 5: es inofensivo.

## Cómo está armado el portal hoy

- `src/data/api/http-client.ts`: transporte intercambiable. `fetchTransport` (API real) y
  `mockTransport` (demo, `src/data/mock/server.ts`, que se carga bajo demanda). Hoy manda
  `Authorization: Bearer` con el token de `session-token.ts` (en `localStorage`) y lee los
  errores como `{ message, errors }`. Desenvuelve `data`/`Data`.
- `src/data/api/endpoints.ts`: el contrato. Las rutas son `/api/...` y la parte de
  autenticación es `/api/auth/login`, `/api/auth/me`, `/api/auth/forgot-password`. **No
  coinciden con el API real** (ver abajo).
- `src/data/repositories/*.repository.ts` -> `src/data/hooks/use-*.ts` -> pantallas en
  `src/features/*`. `src/data/mock/handlers/*` implementa las mismas rutas para la demo
  (`handlers/auth.ts`: el token es `demo.<id de usuario>`).
- Sesión: `src/features/auth/AuthProvider.tsx` (si hay token, llama `me`; escucha
  `sessionToken.onExpired`), `auth-context.ts`, `use-auth.ts`, `LoginPage.tsx` (con cuentas
  de prueba cuando `env.useMocks`), `demo-accounts.ts`. `ApplicationWizard.tsx` llama a
  `acceptSession(response)` al postular (eso necesita F3 en el API).
- Modelo de usuario del portal: `src/data/models/user.ts` (`SessionUser`, `UserRole =
  admin | negocio | alcaldia | guia | turista`, `PORTAL_ROLES = admin, negocio, alcaldia`) y
  `access.ts` (catálogo de permisos).

## Qué trae el API real (resumen; detalle en `api/docs/autenticacion.md`)

- Rutas sin prefijo `/api` y con barra final: `GET /auth/csrf/` (204 + cabecera
  `x-csrftoken`), `POST /auth/web/login/` (`{email, password}` -> 200 `{user}` + cookies, o
  202 `{expires_in}` + cookie `challenge`), `POST /auth/web/two-factor/` (`{code}` -> 200
  `{user}` + cookies), `POST /auth/web/refresh/` (sin cuerpo, usa las cookies -> 204 y rota
  el par), `POST /auth/web/logout/` (204), `GET/PATCH /auth/profile/`,
  `POST /auth/password-forgot/` (`{email}`), `/auth/password-reset/` (`{email, code,
  password}`), `/auth/password-change/` (`{current_password, password}`),
  `/auth/session-revoke/`, y el 2FA: `GET /auth/two-factor/`, `POST /auth/two-factor-setup/`
  (201 `{secret, uri}`), `/auth/two-factor-confirm/` (201 `{codes}`),
  `/auth/two-factor-recovery/` (201 `{codes}`), `/auth/two-factor-disable/` (204,
  `{code, password}`).
- Las cookies `access`/`refresh`/`challenge`/`csrftoken` son `HttpOnly`: el JavaScript no las
  lee. El token CSRF llega **en la cabecera** `x-csrftoken` de `GET /auth/csrf/` y de las
  respuestas de login/2FA/refresh/logout (el API la expone por CORS). Todo método no seguro
  (POST, PATCH, DELETE) con sesión por cookie debe llevar `X-CSRFToken`.
- Peticiones con `credentials: 'include'`. El API ya permite el origen `http://localhost:5173`
  en desarrollo. Portal y API deben compartir el sitio (`localhost` en ambos).
- El `access` vive 3 horas y el `refresh` 1 día, de un solo uso: refrescar rota el par y
  presentar el mismo `refresh` dos veces falla (de ahí el "una sola petición en vuelo").
- Errores: `{ "detail": "...", "field_errors": { "body.campo": "..." } }`. 401 credenciales
  inválidas (mensaje genérico), 403 cuenta que no puede operar (el mensaje dice por qué), 429
  bloqueo por intentos con cabecera `Retry-After` (segundos).
- Usuario de la sesión (snake_case): `id, email, first_name, last_name, name, username,
  birth_date, nationality, status, verified, role, groups, permissions, organization_id,
  two_factor {enabled, required}, created_at`. `role` es `admin | alcaldia | guia |
  institucion | negocio | traductor | turista | null`.
- Reglas de contraseña: mínimo 8 caracteres, una mayúscula y un número (replicarlas en Zod).

## Diseño decidido para `f1-portal-link` (hacer en este orden)

1. **Contrato**: cambiar `endpoints.auth` a las rutas reales de arriba (`csrf`, `login`,
   `twoFactor`, `refresh`, `logout`, `profile`, `passwordForgot`, `passwordReset`,
   `passwordChange`, `sessionRevoke`, `twoFactorStatus`, `twoFactorSetup`, `twoFactorConfirm`,
   `twoFactorRecovery`, `twoFactorDisable`). El resto de `endpoints` (`/api/...`) **se queda**:
   el API todavía no los publica y se alinean fase por fase (F3 en adelante).
2. **`http-client.ts`** (solo en `fetchTransport`; el transporte demo no lo necesita):
   - `credentials: 'include'` y sin cabecera `Authorization`.
   - CSRF: pedir `GET /auth/csrf/` una vez y guardar el valor en memoria (nunca en
     `localStorage`); mandar `X-CSRFToken` en todo método no seguro; actualizarlo con la
     cabecera `x-csrftoken` de cualquier respuesta que la traiga. Si un POST da 403 por CSRF,
     pedir uno nuevo y reintentar **una** vez.
   - 401 en una petición que no sea de autenticación: `POST /auth/web/refresh/` en una sola
     petición compartida (todas las demás esperan esa promesa) y reintentar la original una
     vez. Si el refresco falla, emitir el evento de sesión vencida (lo que hoy hace
     `sessionToken.expire()`).
   - Errores: leer `detail` y `field_errors`; quitar el prefijo `body.` y pasar de
     snake_case a camelCase para que calcen con los campos de los formularios; en 429 leer
     `Retry-After` (agregar `retryAfter` a `ApiError`).
   - `TransportResponse` necesita exponer las cabeceras (para CSRF y `Retry-After`).
3. **Mapeo del usuario** (en `auth.repository.ts` o un esquema Zod con `transform`), del API
   a `SessionUser`:
   - `role`: `admin`, `negocio`, `alcaldia`, `turista` pasan igual; `guia` y `traductor` ->
     `guia` (con `serviceRole` `guide`/`translator`); `institucion` -> `alcaldia` por ahora
     (el portal no distingue; anotarlo como decisión provisional). `null` -> sin acceso.
   - `organization_id` -> `organizationId`; `name`, `email`, `created_at` -> `createdAt`.
   - `status`: `active` -> `active`, `suspended` -> `suspended`, el resto no llega a la sesión
     (el login devuelve 403).
   - `permissions` -> `permissions` tal cual (F2 los alinea con el catálogo de `access.ts`);
     `staffRoleId`, `staffRoleName`, `phone`, `city`, `lastSeenAt` no vienen: `null`/`''`.
   - Si el rol no entra al portal (`!isPortalRole`), cerrar la sesión y mostrar el mismo
     mensaje que ya usa la demo ("Esta cuenta es de la app de K'Plan").
4. **`AuthProvider`**: arrancar con `GET /auth/profile/` (las cookies `HttpOnly` no se pueden
   consultar; un 401 deja el estado en `anonymous`). Opcional: una bandera no sensible en
   `localStorage` para evitar el 401 inicial en la primera visita. `logout` llama
   `POST /auth/web/logout/` y limpia la caché de TanStack Query.
5. **`LoginPage`**: paso 1 correo y contraseña; si responde 202, paso 2 con el campo del
   código (TOTP de seis dígitos o código de recuperación) que llama a `two-factor`. Mostrar
   el 403 tal cual viene; en 429 decir cuánto esperar con `Retry-After`. Mantener las
   cuentas de prueba solo con `env.useMocks`.
6. **Página de Seguridad** (ruta nueva `/seguridad`, enlace desde el menú del usuario en
   `Sidebar.tsx`/`Topbar.tsx`, y entrada en `paths.ts` y `routes.tsx`): estado del 2FA;
   activar (`setup` -> QR con el componente `components/brand/QrCode.tsx` y `lib/qr.ts` +
   mostrar el `secret` para copiar -> `confirm` con el código -> mostrar los 10 códigos de
   recuperación **una sola vez**, con copiar y descargar); regenerar códigos (pide un
   código); desactivar (código y contraseña); cambiar contraseña (cierra todas las sesiones:
   volver a `/entrar`); "cerrar sesión en todos los dispositivos" (`session-revoke`).
7. **Olvidé mi contraseña real**: hoy el texto promete un enlace. El API manda un **código de
   seis dígitos** por correo. Pantalla nueva (p. ej. `/restablecer`): correo + código + nueva
   contraseña -> `password-reset`. Cambiar los textos de "enlace" a "código". La respuesta es
   siempre igual exista o no la cuenta.
8. **Demo**: adaptar `src/data/mock/handlers/auth.ts` a las rutas nuevas (login devuelve
   `{ user }` y guarda el token solo para el transporte demo; `profile`; `password-forgot`
   sin efecto; opcionalmente una cuenta con 2FA simulado). `session-token.ts` queda **solo**
   para la demo: con el API real el JavaScript no toca ningún token.
9. **Pruebas** (Vitest): el cliente HTTP (CSRF en no seguros, refresco compartido ante
   varios 401 simultáneos, reintento único, mapeo de errores) y el mapeo del usuario.
10. **Documentación**: actualizar `README.md` (qué corre con el API real y qué solo en demo) y
    los comentarios de `endpoints.ts`/`env.ts`.

## Límite conocido (decirlo en el README)

Con el API real **solo** funcionan el acceso y la seguridad de la cuenta. El resto de
pantallas pide `/api/organizations`, `/api/stops`, etc., que el API no publica hasta F3 en
adelante; ahí fallarán con 404. Para trabajar la interfaz completa: `npm run dev:demo`.
Cuando una fase del dominio llegue al API, se alinea su sección de `endpoints.ts`, su
repositorio y su handler de demo.

## Próximo paso sugerido

Hacer los puntos 1 a 4 (contrato, cliente, mapeo, `AuthProvider`) y probar contra el API
local (`just up` o el entorno descrito en la memoria del API; superusuario con el correo de
`DJANGO_SUPERUSER_EMAIL` del `.env` del API), luego 5 a 7, y al final 8 a 10. Antes de cerrar:
`npm run typecheck && npm run lint && npm test && npm run build:demo`.
