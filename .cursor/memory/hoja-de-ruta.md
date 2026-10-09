# Memoria de trabajo: portal y la hoja de ruta del API

Actualizada el 2026-10-08. Traspaso para el siguiente agente. La memoria general (estado de
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
  - Google Identity Services: botón en `/entrar`, Client ID público en
    `VITE_GOOGLE_CLIENT_ID` y `POST /auth/web/google/`. Solo enlaza una cuenta existente,
    activa y verificada de una organización o del equipo; no registra cuentas desde el portal.
    Conserva el segundo factor. Pruebas del cargador y del cliente HTTP.
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
- **Hecho: la cola del equipo de F3** (`/solicitudes`, contra `/verification-request/`):
  - `AdmissionsPage` (bandeja con pestañas Abiertas/Aprobadas/Rechazadas/Todas, filtro por clase,
    paginación, `PlaceRequestsView` intacta en la otra vista) y `AdmissionPage` (quién se postuló,
    datos por clase, archivos con enlace de lectura, intentos anteriores, y tomar/devolver/aprobar/
    rechazar con motivo y nota; los botones siguen a `organizations.review|manage` y a quién la tiene).
  - Datos: `models/verification.ts`, `schemas/verification-api.schema.ts`, `repositories/
    verification.repository.ts`, `hooks/use-verification.ts` (`useOpenRequestCount` alimenta el menú y
    `AdminPending`). Demo: `mock/handlers/verification.ts` sobre `db.applications` (`takenById`).
  - **Se retiró el modelo de demo anterior**: `ApplicationWizard`, `ApplySteps`, `DocumentUpload`,
    `AssistedApplicationPage` (el alta asistida; el API no la tiene), `use-admissions`, `admissions.
    repository`, `handlers/admissions.ts` y `uploads.ts`, el esquema y la prueba de la solicitud
    anterior. `models/organization-application.ts` queda solo como la semilla de la demo (de ahí
    salen los expedientes de `db.applications`) y para dos lectores: los estados de cuenta (cobro del
    alta asistida, `services/statements.ts`) y la propiedad de los lugares (`services/ownership.ts`);
    se retira cuando esos pasen al modelo del API.
  - Pruebas: 144 unitarias. Navegador contra el API real con S3 local: `run-e2e-f3-queue.ps1` (20
    comprobaciones: filtros, tomar, devolver, «otro» sin nota, rechazar con motivo, aprobar sin tomar,
    pestañas, 404). Demo: `e2e-f3-demo.mjs` (14, con la cola del equipo).
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
- **Hecho: el equipo y los roles contra el API real** (lo que quedaba de F2 en el portal):
  - **Equipo interno** (`StaffPage`) lee `GET /auth/staff-member/` (ruta nueva del API: el equipo
    con su rol, y los superusuarios con `role: null`, que el portal muestra como "Superusuario"
    sin acciones). Invitar y reenviar la invitación son el mismo `POST /auth/staff-invite/`:
    si responde `sent: false` (espera de 60 s) el aviso dice que use el código del último correo.
    Cambiar el rol es `POST /auth/user-role/`; quitar o devolver el acceso, `POST
    /auth/user-status/`, que pide `users.manage` (sin él no se muestran esos botones). La
    columna "Último acceso" pasó a "En el equipo desde": el API no guarda `last_login`.
  - **Roles y permisos** (`RolesPage`, `RoleSheet`) contra `/auth/staff-role/` (CRUD); el
    formulario suma "Exigir la verificación en dos pasos" (`requires_two_factor`, encendido por
    defecto) y las personas de cada rol salen de `members`.
  - Datos: `schemas/team-api.schema.ts` (+ prueba; ids de rol enteros en el API y texto en la
    demo, `roleReference` los devuelve como vinieron), `repositories/users.repository.ts`
    (`staffRolesRepository`, `staffRepository`), `hooks/use-users.ts`. Demo:
    `mock/handlers/users.ts` habla el mismo formato (incluida la espera de 60 s entre correos).
  - Pruebas: 153 unitarias. Navegador: `e2e-f2-team.mjs` (11 comprobaciones: lista, invitar,
    reenviar dentro del minuto, cambiar el rol, crear un rol sin 2FA, editarlo, nombre repetido,
    borrarlo, quitar y devolver el acceso), contra el API real y en demo (`E2E_PORTAL`,
    `E2E_ROLE_A` y `E2E_ROLE_B` cambian el puerto y los nombres de los roles).
- **Hecho: la cola de guías y traductores de F5** (`/guias`, contra `/provider-request/`):
  - `GuideApplicationsPage` (bandeja con pestañas, filtros por servicio y trámite, paginación) y
    `GuideApplicationPage` (documentos con el visor y aceptar o rechazar con motivo, pedir
    correcciones, aprobar o rechazar con un motivo de la decisión, tomar y devolver; perfil,
    contacto e historial). Los botones siguen a `guides.review|decide` y a quién la tiene.
  - Datos: `models/provider.ts`, `schemas/provider-api.schema.ts` (+ prueba),
    `repositories/providers.repository.ts`, `hooks/use-providers.ts` (`useOpenProviderCount`
    alimenta el menú y `AdminPending`). "Todos los usuarios" (demo) muestra la solicitud de cada
    guía con la misma bandeja.
  - Demo: `mock/handlers/providers.ts` y `mock/services/providers.ts` con las mismas reglas que el
    API sobre `db.providers`, sembrado por `mock/generators/providers.ts` desde los guías de la app
    y `guide_applications.json` (escaneos de muestra). **Se retiró el modelo anterior**: antecedentes,
    etapas, asignar y la revisión por lista de chequeo (`models/guide.ts` queda con `GuideServiceRole`)
    y los componentes de `features/verification` que solo usaba (quedan `Notice`, `DocumentViewer`
    y `STAGE_LIMIT_MINUTES`).
  - Navegador: `e2e-f5-queue.mjs` contra el API real (23 comprobaciones: la app se postula, revisar,
    rechazar con nota, pedir correcciones, corregir solo lo rechazado, aprobar, entrar como guía,
    renovar, rechazar en la decisión) y `e2e-f5-demo.mjs` en demo (6).
- **Hecho: el directorio de cuentas y F4 contra el API real** (commits `d9cbae0`, `67c5bbc` y
  `b1df681`). Estas pantallas ya no usan rutas de demo:
  - Todos los usuarios (`UsersPage`, `UserSheet`): el directorio de cuentas del API.
  - Lugares (`place/`), sus fichas (`place/{id}/profile/`) y sus novedades (`post/`).
  - Circuitos (`official-circuit/`, docs/territorio.md del API): la lista trae todas las páginas
    y filtra en el cliente (solo "Retirados" pide `status=retired`); el editor guarda con `PUT`
    completo y retira con `DELETE` después de escribir el nombre exacto (RF-A-09). Las paradas
    salen de `stop/?city=`. Fotos por `POST /upload/` con `kind: "circuit-photo"` (sin bucket,
    503 y el formulario lo dice). Los horarios de grupo pasaron a ser las salidas de guía
    (`circuit/{id}/departure/`, F7), en solo lectura (`DeparturesPanel`); la agenda nombra los
    grupos con la lista pública `circuit/`.
  - La alcaldía entra a Circuitos (menú; `RequireRole ['admin', 'alcaldia']` >
    `RequireActiveOrganization` > `RequirePermission circuits.view`): ve los de su ciudad, crea y
    edita los suyos (el API los fuerza creativos y de su ciudad) y ve los del equipo en solo
    lectura (el API responde 403 si los toca). Quién edita lo decide
    `features/circuits/lib/access.ts`; el equipo necesita `circuits.manage` para cambiar algo.
    La sesión no trae la ciudad de la alcaldía: el editor la saca de sus lugares
    (`useOwnCity`) o de sus circuitos, y si no la encuentra el API la pone.
  - El demo habla el mismo formato (`SCHEMA_VERSION` 11, `mock/services/circuits.ts`).
  - El contrato de circuitos se probó contra el API local con un script temporal de vitest
    (sesión web): el equipo lista y guarda de vuelta sin cambiar la versión; la alcaldía crea
    sin ciudad (cae en León), no publica sin foto (400 en `images`), recibe 403 al editar o
    retirar uno del equipo y retira el suyo (204); una parada que no existe llega como
    `stops.1.point_id`; subir una foto da 503. Las pantallas no se recorrieron en un navegador.
- **Hecho: F6, las reseñas de F7 y F8 contra el API real** (commits `5ee929c` a `73cf2a2`, uno
  por área). Ya no usan rutas de demo:
  - Circuitos: las salidas salen de `official-circuit/{id}/departure/` (también las canceladas y
    las de uno no publicado; `DeparturesPanel` las tacha). Despublicar pide confirmar y, como
    retirar, dice que cancela las próximas salidas y reservas y avisa a turistas y guías.
  - Eventos (`cultural-event/`; `EventsPage`, `EventDrawer`, `EventDialogs`): la institución o la
    alcaldía programa, corrige, cancela con motivo y clona con fechas nuevas; `content.moderate`
    programa especiales de K'Plan, destaca y oculta con motivo o muestra. Clases de
    `catalog/event-category/`, fotos `event-photo`. La ciudad no cambia al corregir (`PATCH` no la
    acepta): el formulario la muestra como texto. El comercio ya no tiene Eventos (el API le da
    403). La ficha de una organización cuenta sus eventos con `organizer_id`. Modelo
    `CulturalEvent`.
  - Insignias: el QR de `place/{id}/qr/` en la sección "Código QR" del lugar (`QrPoster`);
    `BadgesPage` lista los lugares con insignia y su QR, y `places.manage` la enciende ahí. Las
    activaciones y campañas de insignias de la demo salieron de la pantalla.
  - Cupones (`coupon-campaign/`, `coupon-redemption/`, `catalog/benefit-type/`): hasta tres
    activas, corregir sin tocar beneficio ni costo, retirar con motivo; `content.moderate` ve y
    retira (sólo las activas: el API da 409 con agotadas, vencidas o retiradas). Validar busca
    el código con `coupon-redemption/?code=` sin gastarlo, dice si ya se usó, venció o no es del
    comercio, y si vale lo consume con `validate/`. Código de ocho caracteres sin I, O, 0 ni 1.
  - Reseñas impugnadas (`/resenas`, `review-dispute/`, `content.moderate`).
  - Finanzas: `/cobros` (pagos de reservas `payment/` y estados de cuenta `billing/statement/`),
    `/retiros` (`guide-withdrawal/`; el número completo sólo con `billing.manage`), `/tarifas`
    (`pricing/`) y `/pagos` del comercio (sus estados de cuenta y las tarifas vigentes de
    `pricing/`: insignia al mes y cupón validado). La alcaldía ya no tiene "Pagos" (403).
    `AdminPending` cuenta pagos, retiros y estados por cobrar.
  - Reportes (`/reportes`, `report/`), Sanciones (`/sanciones`, `sanction/`) y "Sancionar" con
    sus sanciones en la ficha de "Todos los usuarios" (`UserSheet`).
  - Campana de avisos (`NotificationBell` en `Topbar`): no leídos de `notification/` cada minuto,
    los últimos diez al abrirla, marcar uno o todo leído.
  - Compartido: `schemas/api-common.ts` (página, foto, ciudad, instantes en hora de Managua) y
    `components/ui/Pager.tsx`.
  - Demo (`SCHEMA_VERSION` 17): `mock/services/agenda.ts`, `rewards.ts`, `finance.ts` y
    `moderation.ts`, con las mismas rutas y reglas. Se retiraron `services/statements.ts` (con el
    cobro del alta asistida) y los canjes y pagos del modelo anterior.
  - Pruebas: 227 unitarias; `mock/handlers/demo-contract.test.ts` comprueba que la demo responde
    como el API (filtros `code` y `organizer_id`, `pricing/` del comercio, 409 al retirar una
    campaña agotada). El contrato se probó contra el API local con un script temporal de
    vitest (borrado): agenda (alcaldía, equipo y 403 del comercio), cupones (publicar, 400 con
    150 %, corregir, 404 con un código ajeno, retirar, 409 al corregir una retirada), finanzas
    (equipo, comercio, 403 de la alcaldía en estados de cuenta), sanciones (suspender una turista
    por un día, levantar, 409 al repetir), avisos, QR (200 con insignia, 404 sin ella) y 503 al
    subir `event-photo` y `coupon-photo`. Las impugnaciones sólo se leyeron (la base local no
    tiene). Muchos inicios de sesión seguidos disparan el límite del API: esperar un minuto. Las
    pantallas no se recorrieron en un navegador; la demo se probó con otro script temporal.
  - No hay cuenta de institución local: se crea con `/postular` (clase institución, hace falta el
    bucket local de la memoria del API para el documento) y se aprueba en `/solicitudes`.
- **Hecho: F9, el panel de la landing** (2026-10-08, rama `feat/landing-demo-y-versiones`; contrato en
  `docs/landing.md` del API). Grupo "Sitio web" del menú del equipo:
  - Rediseño (2026-10-08, pedido del usuario): no se suben instaladores. Cada versión lleva el
    link de Drive de su instalador; la landing no tiene descarga directa: al enviar el formulario
    de demo el API responde `{delivered, links}` con los links de las versiones vigentes. Si no
    había ninguna, la landing dice que le van a avisar (no se manda correo) y la solicitud queda
    pendiente.
  - `/demos` (`DemoRequestsPage`, `demo-request/`): pestañas Pendientes, Entregadas y Todas,
    búsqueda, correo y teléfono como enlaces, "Recibió los links el …" (`deliveredAt`), y con
    `demos.manage` "Marcar entregada" (un clic) y "Anotar"/"Actualizar" (estado y seguimiento). El
    contador `pendingDemos` del menú y `AdminPending` salen de `usePendingDemoCount`. La campana
    muestra `solicitud_demo`.
  - `/versiones` (`ReleasesPage`, `app-release/`): la vigente de cada plataforma arriba con sus
    entregas, historial, "Nueva versión" (plataforma, versión, link https, novedades) como
    borrador, editar (link y novedades siempre; la versión solo en borrador), publicar, retirar,
    borrar un borrador y "Abrir el link para probar".
  - Permisos en `models/access.ts`: `demos.view|manage` y `releases.view|manage` (módulo "Sitio
    web"), con las descripciones del catálogo del API; el Super admin de la demo los tiene.
  - Datos: `models/landing.ts`, `schemas/landing-api.schema.ts` (+ prueba),
    `repositories/landing.repository.ts`, `hooks/use-landing.ts`. Demo (`SCHEMA_VERSION` 19):
    `mock/services/landing.ts` y `mock/handlers/landing.ts` (+ `landing.test.ts`). La validación del
    mock responde `422` (el API real, `400`); la pantalla solo lee `field_errors`.
  - Navegador: `%LOCALAPPDATA%\Temp\kplan-dev\e2e\e2e-f9-links.mjs` (13 comprobaciones; Edge con
    `playwright-core`, sin descargar navegadores). Pide el API local en `:8010`, la landing en
    `:5173` con `VITE_API_URL=http://127.0.0.1:8010` y el portal en demo en `:5174`; prepara las
    versiones con `f9_setup.py` (ORM del API).
- Comprobaciones: `npm run typecheck && npm run lint && npm test && npm run build:demo`.

## Qué falta (depende de otras fases)

1. **Siguen en demo** (rutas `/api/...` de `endpoints.ts`: con el API real responden 404 y se
   trabajan con `npm run dev:demo`):
   - Organizaciones (`/api/organizations`, lista y detalle del equipo): el API todavía no publica
     la lista de organizaciones del portal.
   - Solicitudes de lugares (`/api/place-requests`, `/api/stops/available`): el API no tiene que
     una organización aprobada pida administrar otro lugar; hoy el equipo le da dueño con
     `PUT place/{id}/owner/`.
   - Las activaciones y campañas de insignias de la demo anterior (`/api/badge-*`): sólo las
     dibuja la agenda; el API no las tiene (la insignia es `has_badge` del lugar).
   - La agenda de llegadas (`/api/visit-events`): el API la dejó para después (docs/servicios.md,
     "Lo que queda para después").
   Queda por retirar lo que dejó F3: la propiedad de los lugares por `claimedStopIds` en
   `ownership.ts` y `generators/admissions.ts`.
   Un `429` en `GET /auth/profile/` al cargar la página lleva a la pantalla de entrada sin cerrar la
   sesión (`AuthProvider`); conviene mostrar un error con "Reintentar" en vez del login.
2. **Anotado para el API** (no se tocó):
   - Decidido por el usuario, no pedirlo: la sesión no trae la ciudad de la organización (el
     portal la saca de sus lugares) y los estados de cuenta son sólo de comercios.
   - Con menos de dos paradas, `body.stops` dice "Este campo necesita al menos 2 elemento(s).":
     legible, pero podría decir "Un circuito necesita al menos dos paradas".
   - El límite de inicios de sesión corta los scripts de contrato que entran con varias cuentas.
3. Decisiones abiertas: cómo distinguir `institucion` de `alcaldia` en el portal (hoy iguales).

## Cómo probar contra el API real en esta máquina

El Postgres portátil y el API local se describen en la memoria del API (sección 10). Resumen:
con el API en `http://localhost:8080` y `npm run dev` (puerto 5173) se entra con el superusuario
del `.env` del API. El script de navegador que usé está fuera del repo, en
`%LOCALAPPDATA%\Temp\kplan-dev\e2e` (`run-e2e.ps1`); si no existe, la prueba de integración de
arriba cubre el contrato.

Cuentas locales (contraseña `Kplan-Local-2026`): `admin@example.com` (superusuario) y
`alcaldia.leon@example.com` (Alcaldía de León); se recrean con `dev_accounts.py` (memoria del
API, sección 10). La alcaldía no entra por `/auth/mobile/login/` (el API la rechaza por la
superficie con el mismo error que una contraseña mala): en un script, `GET /auth/csrf/`,
`POST /auth/web/login/` con `X-CSRFToken` y reenviar las cookies a mano.

## Cómo está armado el portal

- `src/data/api/http-client.ts`: `createFetchTransport` (real), transporte de demo (se carga
  bajo demanda) y `createHttpClient` (renovación de sesión). `endpoints.ts` es el contrato.
- `src/data/repositories/*.repository.ts` -> `src/data/hooks/use-*.ts` -> pantallas en
  `src/features/*`. `src/data/mock/*` implementa las mismas rutas para la demo.
- Sesión: `src/features/auth/AuthProvider.tsx` (+ `auth-context.ts`, `use-auth.ts`),
  `src/app/router/guards.tsx` (`RequireAuth`, `RequireRole`, `RequirePermission`).
- Los DTO del API usan snake_case; el portal, camelCase: la traducción vive en los
  repositorios y en `session.schema.ts`, nunca en las pantallas.
