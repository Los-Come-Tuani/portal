# K'Plan · Portal

Portal web de K'Plan para **negocios**, **alcaldías** y el **equipo de K'Plan**. Los turistas y los guías usan la app móvil (`../mobile`).

## Qué hace

- **Agenda**: a qué hora llegan los turistas según su itinerario (por día, semana o mes), quién llegó escaneando el QR y por qué otros no llegaron.
- **Lugares**: la ficha de cada parada tal como la ve el turista, con vista previa de la app, mapa, qué ofrecemos, servicios y contacto, novedades y el cartel con el código QR.
- **Cupones**: se pagan con insignias; el negocio los valida con el código del turista y K'Plan cobra una tarifa fija por canje.
- **Eventos**: mini eventos de negocios, talleres y charlas de alcaldías, eventos especiales de K'Plan.
- **Insignias**: activar la insignia de un lugar y campañas de ×2, ×3 o ×5 insignias por visita.
- **Pagos**: estado de cuenta mensual con cada cargo explicado.
- **Admin**: organizaciones (aprobar, suspender), lugares, circuitos (incluidos los especiales de K'Plan, con insignias extra y temporada), cupones, eventos, cobros y tarifas.
- **Postulación** (`/postular`): un **comercio**, una **institución cultural** o una **alcaldía** se postulan sin cuenta, en cinco pasos: qué son, sus datos (en un comercio, el mapa y el RUC), lo que suben (el horario y el platillo estrella con su foto, o el documento que acredita a la organización), su cuenta con el correo verificado por un código, y la revisión. Entran al portal con acceso limitado a **Mi solicitud** (`/solicitud`), donde ven en qué va; si el equipo la rechaza dicen el motivo y se **corrige y vuelve a enviar** (`/solicitud/corregir`) con lo anterior ya llenado. Contrato y decisiones: `docs/organizaciones.md` del repo del API.
- **Solicitudes del equipo** (**Organizaciones → Solicitudes**, `/solicitudes`): una sola bandeja para las tres clases, por orden de llegada, con las pestañas Abiertas, Aprobadas, Rechazadas y Todas, filtro por clase y paginación. Cada solicitud muestra quién se postuló, los datos de la organización, sus archivos (con enlace de lectura que vence en minutos) y los intentos anteriores; el equipo la **toma**, la **devuelve a la cola**, la **aprueba** (con una nota) o la **rechaza** con un motivo del catálogo y una nota. Quien se postuló recibe un correo con la decisión. Ver y actuar piden `organizations.view` y `organizations.review` o `manage`. Ya no hay revisión por documento ni alta asistida: el API decidió un solo paso de decisión.
- **Pedidos de lugares**: una organización aprobada pide otro lugar desde **Mis lugares** y el equipo lo decide en **Solicitudes → Lugares pedidos**; también puede asignar o quitar lugares desde el detalle de la organización.
- **Guías y traductores** (`/guias`, contra `/provider-request/` del API): se postulan y renuevan sus documentos desde la app. La bandeja va por orden de llegada, con las pestañas Abiertas, Aprobadas, Rechazadas y Todas y filtros por servicio y trámite. Se revisa en dos pasos: quien revisa (`guides.review`) ve cada documento dentro del portal, lo acepta o lo rechaza con un motivo y pide correcciones; con todo aceptado, quien decide (`guides.decide`) aprueba o rechaza. Al corregir, lo aceptado no se vuelve a revisar; una renovación se resuelve sola al revisar su documento. Contrato: `docs/prestadores.md` del repo del API.
- **Usuarios y equipo interno**: todas las cuentas del sistema, el equipo de K'Plan con su rol y una matriz de roles y permisos. Cada persona del equipo ve sólo los módulos que su rol permite. El equipo (invitar, reenviar la invitación, cambiar el rol, quitar o devolver el acceso) y los roles (crear, editar, exigir la verificación en dos pasos, borrar) van contra `/auth/staff-*` del API; "Todos los usuarios" sigue siendo de la demo hasta que el API tenga ese directorio.

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
npm run dev        # contra el API local (http://localhost:8080, ver .env.development)
npm run dev:demo   # sin API: backend simulado en el navegador
```

La app queda disponible en http://localhost:5173. Con `npm run dev:demo`, la pantalla de entrada muestra las cuentas de prueba (negocios, alcaldías y varias personas del equipo con roles distintos): cualquier contraseña sirve.

`npm run dev` necesita el API corriendo (`just run` en el repo del API). Usa `localhost` en los dos lados y no `127.0.0.1`: las cookies de sesión solo viajan si portal y API son del mismo sitio.

## Datos: modo demo y API real

Las pantallas nunca saben de dónde vienen los datos:

```text
pantalla → hook (src/data/hooks) → repositorio (src/data/repositories) → cliente HTTP (src/data/api) → API real o backend de demo
```

- **Modo demo** (`VITE_USE_MOCKS=true`, que activan `npm run dev:demo` y `npm run build:demo`; ver `.env.demo`): el cliente HTTP manda cada petición al backend de demo (`src/data/mock`). Este implementa las mismas rutas de `src/data/api/endpoints.ts` con los JSON de `src/data/mock/json` y guarda los cambios en `localStorage`. El menú "Modo demo" de la barra superior restablece los datos. Es explícito: dejar `VITE_API_URL` vacía ya no activa la demo.
- **API real** (`VITE_API_URL`): `.env.development` apunta a `http://localhost:8080` y `.env.production` (el build que se publica) a `https://develop-api.kplan.dev`; una variable `VITE_API_URL` del hosting manda sobre ese archivo. `npm run build` falla si falta, si no es `https` o si el modo demo está activo. El backend de demo ni siquiera se descarga.
- **Variables**: ver `.env.example`. Todo `VITE_*` termina dentro del bundle del navegador, así que solo van valores públicos, nunca claves ni tokens. Los valores propios van en `.env.development.local`, que no se versiona.
- **El contrato con el backend** es `endpoints.ts` (las rutas) más `src/data/models` (el formato JSON, el mismo que lee la app). El cliente acepta respuestas planas o envueltas en `data` / `Data`.
- **Qué funciona con el API real hoy**: el acceso y la seguridad de la cuenta (entrar, 2FA, recuperar y cambiar la contraseña, cerrar sesiones), el **equipo interno y sus roles**, la **cola de guías y traductores**, y la **postulación de una organización**, con su revisión por el equipo (alta, estado, corrección y cola, ver abajo). Las demás pantallas piden `/api/stops`, `/api/circuits`, etc., que el API todavía no publica (llegan por fases): ahí responden 404. Para trabajar la interfaz completa usa `npm run dev:demo`. Cuando una fase del dominio llega al API, se alinean su sección de `endpoints.ts`, su repositorio y su handler de demo.

### La postulación contra el API

- **Los archivos no pasan por el API**: `POST /upload/` devuelve una URL firmada y el navegador hace un `PUT` directo al bucket (`src/data/api/upload.ts`); lo que viaja con la solicitud es la **clave** del archivo. Un bucket sin CORS para el origen del portal falla en el navegador con un error de red: la guía del API (`docs/archivos.md`) trae la política (`PUT` con `Content-Type`). Sin bucket configurado, el API responde `503` y el formulario lo dice.
- **La sesión trae la organización** (`user.organization`: `{ id, kind, name, verified }`). El portal la usa para saber si ya está aprobada (`verified`) sin pedir nada más; el detalle (ciudad, lugares) llega con los lugares. `organizationsRepository.ofSession` lo resuelve.
- **El estado se actualiza solo**: mientras la solicitud espera, `Mi solicitud` pregunta cada 30 s; si el equipo la aprueba con la página abierta, el portal vuelve a pedir la sesión y abre el menú.
- **Probar con archivos de verdad** sin una cuenta de Cloudflare: un servidor S3 local (`moto_server -p 9444`, instalado aparte) con un bucket y el CORS de `docs/archivos.md`, y en el API `STORAGE_ENDPOINT_URL=http://127.0.0.1:9444`. El modo demo no lo necesita: guarda los archivos en el navegador.
- **En el modo demo** el menú "Modo demo" suma "Aprobar / Rechazar mi solicitud (como el equipo)" para ver cada salida desde quien se postuló, y la cola del equipo (`admision@kplan.demo`) trabaja sobre los mismos expedientes. El código del correo es `123456`. Los datos de la demo viven en el navegador: otra ventana privada empieza de cero.
- **La cola contra el API real**: `src/data/repositories/verification.repository.ts` lee y actúa sobre `/verification-request/` (paginado, `status`, `kind`); el contador del menú y el de `AdminPending` salen de la misma bandeja (`useOpenRequestCount`). Un `429` del perfil al cargar la página manda a la pantalla de entrada sin cerrar la sesión: recargar mucho seguido, como hacen las pruebas de navegador, topa con el límite.

## Sesión y seguridad

La sesión vive en cookies `HttpOnly` que pone el API (`/auth/web/*`): el JavaScript del portal **nunca** ve ni guarda un token, así que un XSS no puede robarlo. El cliente HTTP (`src/data/api/http-client.ts`) se ocupa de lo demás:

- Todas las peticiones van con `credentials: 'include'`. Cada `POST`, `PATCH` o `DELETE` lleva el token CSRF en `X-CSRFToken`: se pide una vez a `GET /auth/csrf/` y se guarda solo en memoria. Si el API lo rechaza, se pide uno nuevo y se reintenta una vez.
- Si una petición con sesión recibe `401`, el acceso venció: se renueva la sesión con `POST /auth/web/refresh/` y se reintenta la petición. El `refresh` es de un solo uso, así que la renovación es **una sola aunque fallen varias peticiones a la vez**. Si el API la rechaza, la sesión termina y se vuelve a `/entrar`. Un corte de red no cierra la sesión.
- Al abrir el portal, `AuthProvider` pregunta `GET /auth/profile/` solo si antes hubo un inicio de sesión (`kplan.portal.session` en `localStorage` es una bandera, no un token).
- **Entrar** (`/entrar`): correo y contraseña, o Google para una cuenta del portal ya activada. Google no registra organizaciones ni miembros del equipo: el negocio o la alcaldía primero completa su postulación y el equipo acepta su invitación. Si la cuenta tiene 2FA, un segundo paso pide el código de 6 dígitos de la app de autenticación o un código de recuperación. Tras cinco intentos fallidos el API bloquea el acceso quince minutos (`429` con `Retry-After`) y el portal dice cuánto esperar.
- **Recuperar la contraseña** (`/restablecer`): el API manda un código de 6 dígitos al correo (vence en 15 minutos); con él se escribe la contraseña nueva. Responde igual exista o no la cuenta.
- **Activar la cuenta** (`/invitacion`, sin sesión): quien recibió una invitación al equipo escribe el código de 6 dígitos del correo y elige su contraseña (`POST /auth/staff-accept/`). El enlace del login ("¿Te invitaron al equipo?") lleva ahí con el correo ya escrito. Un correo sin invitación y un código malo dan la misma respuesta.
- **Seguridad** (`/seguridad`, desde el menú del usuario; la ven todos los roles): activar el 2FA (QR, clave y código de confirmación), ver y regenerar los códigos de recuperación (se muestran **una sola vez**), desactivarlo, cambiar la contraseña y cerrar sesión en todos los dispositivos. Cambiar la contraseña o cerrar todas las sesiones termina también la sesión de este navegador.
- El usuario del API (`role`: `admin`, `alcaldia`, `institucion`, `negocio`, `guia`, `traductor`, `turista`) se traduce al del portal en `src/data/schemas/session.schema.ts`. Hoy `institucion` se trata como alcaldía y guías, traductores y turistas no entran (el portal es para negocios, alcaldías y el equipo). Los permisos del equipo son los del catálogo de `src/data/models/access.ts` (los mismos identificadores del API); cualquier otro código se ignora.
- **Permisos del equipo**: cada módulo tiene un permiso de solo ver (`guides.view`, `organizations.view`, `places.view`, `circuits.view`, `users.view`, `billing.view`) y otros que cambian cosas. Quien puede revisar, decidir o administrar un módulo ya lo ve: el API entrega la sesión expandida (`expandPermissions` hace lo mismo en la demo). El menú (`navigationFor`) y las rutas (`RequirePermission`) piden el permiso de ver; los botones de cada pantalla piden el que cambia.
- **Segundo factor obligatorio**: si el rol de la cuenta lo exige (`twoFactor.required`) y todavía no lo activó, `RequireAuth` solo la deja usar `/seguridad` hasta que lo haga (el API responde `403` a todo lo demás).
- En modo demo el backend simulado imita lo mismo (sesión, 2FA, recuperación) y el código que sirve siempre es `123456`.

### Probar contra el API de verdad

Con el API local corriendo (`just run` en el repo del API) y una cuenta de desarrollo:

```bash
KPLAN_API_URL=http://localhost:8080 KPLAN_TEST_EMAIL=correo@ejemplo.com KPLAN_TEST_PASSWORD=... npx vitest run src/data/api/api.integration.test.ts
```

Comprueba CORS, cookies, CSRF, la renovación de la sesión y el 2FA completo con códigos reales. Activa y desactiva el 2FA de esa cuenta: no la uses con una cuenta real. Sin esas variables, las pruebas se saltan.

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
  features/      un módulo por sección: auth, onboarding (postulación), dashboard, arrivals (agenda), places, coupons,
                 events, badges, billing, admin; verification tiene lo común a toda revisión con documentos
  hooks/         hooks compartidos
  lib/           utilidades puras: formatos, fechas de Managua, horas, planificador de itinerarios (port de la app), QR
  styles/        tokens y estilos base
```

## Colores

Todos los colores viven en un solo bloque de `src/styles/theme.css`, espejo de `mobile/lib/src/core/theme/app_colors.dart`: cambiar un color es cambiar una línea ahí (y en la app). Los componentes sólo usan roles como `bg-canvas`, `text-ink`, `bg-brand` o `bg-planned`; Tailwind no tiene otros colores disponibles. El sistema visual completo está en `DESIGN.md`.

## Scripts

- `npm run dev`: servidor de desarrollo con recarga en caliente (HMR), contra el API local.
- `npm run dev:demo`: lo mismo, pero en modo demo (sin API).
- `npm run build`: verifica los tipos y genera el build de producción en `dist/`. Exige `VITE_API_URL` con `https`.
- `npm run build:demo`: build en modo demo, solo para publicar una demo a propósito.
- `npm run typecheck`: sólo verifica los tipos.
- `npm run lint`: revisa el código con Oxlint.
- `npm run test`: corre las pruebas (formatos, horas, planificador de itinerarios, agenda, cliente HTTP con CSRF y renovación de sesión, y el usuario del API). Las de integración con el API se saltan sin `KPLAN_API_URL`.
- `npm run preview`: sirve localmente el build de producción.
