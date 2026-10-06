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
- **Hecho: lado del portal de F2** (el API ya entrega los permisos funcionales y los roles):
  - `models/access.ts`: los 17 IDs del API, con los de solo ver (`*.view`), etiquetas del
    catálogo y `IMPLIED_BY` / `isImplied` / `expandPermissions` (quien revisa, decide o
    administra un módulo ya lo ve). El editor de roles marca como incluido el "ver" que ya da
    otro permiso.
  - `navigation.ts`, `routes.tsx`, `Sidebar.tsx`, `AdminPending.tsx`, `UsersPage.tsx`: piden el
    permiso de ver; los botones de cada pantalla siguen pidiendo el que cambia cosas. Un rol que
    solo ve guías solo ve "Guías y traductores".
  - `RequireAuth` (`guards.tsx`): un rol con `twoFactor.required` sin 2FA activo solo puede usar
    `/seguridad` (la página ya avisa por qué).
  - `/invitacion` (`AcceptInvitationPage`): correo + código + contraseña ->
    `POST /auth/staff-accept/`; enlace desde el login. Demo: acepta `123456` para una persona
    `invited`.
  - Demo (`mock/`): la sesión se expande como la del API y las rutas de lectura de guías,
    organizaciones, circuitos y usuarios piden el permiso de ver.
  - `http-client.ts`: un cuerpo que no es JSON (la página HTML de un 404) ya no se muestra como
    mensaje de error; sale del código de estado.
  - Pruebas: 94 unitarias (`access.test.ts`, `navigation.test.ts`, `session.schema.test.ts`,
    `http-client.test.ts`...). Verificado en el navegador contra el API real con
    `%LOCALAPPDATA%\Temp\kplan-dev\e2e\run-e2e-f2.ps1` (19 comprobaciones): un rol que solo ve
    guías es llevado a Seguridad, activa el 2FA, ve solo su módulo, y una invitación se acepta
    con el código del correo y no se puede reutilizar.
- **Hecho: lado del portal de F3 para quien se postula** (alta, estado y corrección contra el API real):
  - `/postular` (`ApplyPage` -> `components/ApplicationFlow.tsx`): cinco pasos (qué es, sus datos con
    el mapa, lo que sube, la cuenta con código por correo, revisión) para las tres clases. Los
    archivos van con un `PUT` firmado directo al bucket (`src/data/api/upload.ts`) y viajan por su
    clave. El borrador vive en `sessionStorage` sin contraseña ni código (`lib/flow.ts`).
  - `/solicitud` (`ApplicationStatusPage`): estado, motivo y nota si la rechazaron, lo que mandó, y
    pregunta cada 30 s mientras espera; al aprobarla vuelve a pedir la sesión (`refreshUser` ahora
    también recarga la organización). `/solicitud/corregir` (`CorrectApplicationPage`): el mismo
    formulario en modo `correct`, con lo anterior ya llenado (`submitted` del API).
  - Datos: `models/application.ts` (modelo), `schemas/application-api.schema.ts` (formato del API en
    ambos sentidos), `schemas/application.schema.ts` (reglas del formulario, las mismas del API),
    `repositories/applications.repository.ts` y `hooks/use-applications.ts`.
  - La sesión: `apiSessionUserSchema` lee `organization` y `organizationsRepository.ofSession` arma la
    organización con eso (sin pedir `/api/organizations/{id}`, que el API no publica): sin esto un
    operador no podía ni entrar con el API real.
  - Demo: `mock/handlers/applications.ts` habla el mismo formato (catálogos, subida, alta, `mine`,
    corregir) y guarda los expedientes en `db.applications`; los de demo que ya traían una solicitud
    se siembran desde el modelo anterior. El menú "Modo demo" hace de equipo: aprueba o rechaza.
  - Pruebas: 139 unitarias. En el navegador (Edge) contra el API real con un bucket S3 local (moto):
    `%LOCALAPPDATA%\Temp\kplan-dev\e2e\run-e2e-f3.ps1`, 41 comprobaciones (alta de un comercio con
    mapa y foto, rechazo con motivo, corrección con lo anterior llenado, reenvío, aprobación vista
    sin recargar, institución con PDF, un RUC repetido); y `e2e-f3-demo.mjs` en demo (9).
- Comprobaciones: `npm run typecheck && npm run lint && npm test && npm run build:demo`.

## Qué falta (depende de otras fases)

1. **Equipo, roles y usuarios contra el API real** (parte de F2 que sigue siendo demo).
   `StaffPage`, `RolesPage`, `InviteSheet`, `ChangeRoleDialog` y `UsersPage` hablan con
   `/api/users` y `/api/staff-roles` (solo demo). El API ya publica lo necesario bajo `/auth/`:
   `staff-role/` (CRUD), `staff-permission/` (catálogo), `staff-invite/` (respuesta con `sent`:
   si es `false` no salió otro correo por la espera de 60 s), `user-role/`, `user-status/` y
   `user-password-reset/`; ver `api/docs/roles.md`. Falta: alinear `endpoints.ts`, los
   repositorios y los handlers de demo con esas rutas y traducir snake_case a camelCase; y un
   endpoint del API para **listar al equipo** (hoy solo existe `/auth/user/` con `group_id`,
   `status` y `search`; sin filtro por rol del portal). Los roles del API tienen `name`,
   `description`, `permissions`, `requires_two_factor`, `members` y `system` (el rol de sistema
   es "Administrador").
2. **F3: la cola del equipo contra el API real** (el lado de quien se postula ya está, ver arriba).
   `AdmissionsPage`, `AdmissionPage`, el contador de la barra lateral (`useAdmissions`),
   `AdminPending` y `OrganizationDetailPage` siguen en el **modelo de demo anterior** (revisión por
   documento, etapas `documents` -> `decision`, asignación, alta asistida con cobro, `OrganizationApplication`
   en `models/organization-application.ts`) y con el API real responden 404. El API publica otra cosa
   (confirmada con el usuario): tres clases de organización, **un solo paso de decisión** (tomar,
   devolver, aprobar o rechazar con motivo), corregir = otro expediente. Hay que escribir las
   pantallas nuevas contra `GET /verification-request/` (filtros `status`: `open|submitted|in_review|
   approved|rejected|all`, `kind`, `page`, `page_size`), `.../{id}/` (trae `applicant`, `business|
   institution|municipality`, `documents` con URL de lectura de 5 min, `resolution` e `history`),
   `.../reason/` (los motivos) y `POST .../{id}/take|release|approve|reject/`; después retirar el
   modelo anterior: `ApplicationWizard` (hoy solo lo usa el alta asistida), `ApplySteps`,
   `DocumentUpload`, `ApplyGuide`, `lib/draft.ts`, `organization-application.*`, `handlers/admissions.ts`
   y `generators/admissions.ts`. La parte de demo de F3 (`mock/handlers/applications.ts`) ya
   guarda los expedientes en `db.applications`, con el formato del API: la cola nueva se apoya en eso.
   Permisos de la cola: `organizations.view` para ver; `organizations.review` o `manage` para actuar.
   El resto de `endpoints` (`/api/stops`, `/api/circuits`...) es de F4 en adelante: responden 404
   con el API real y solo se trabajan en demo (`npm run dev:demo`); al llegar cada fase se alinea
   su sección de `endpoints.ts`, su repositorio y su handler de demo (sin prefijo `/api`, con
   barra final).
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
