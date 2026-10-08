---
icon: lucide/plug
---

# API (para cuando exista)

Lo que la app ya espera (`lib/src/data/datasources/remote/`):

- REST con JSON y `Authorization: Bearer <token>`.
- La respuesta puede venir plana o envuelta en `data` / `Data`.
- El usuario acepta `id`/`Id`, `email`/`Email`, `name`/`Nombre` y `token`/`Token`. Esto sugiere un backend con convenciones tipo .NET, aunque no está decidido.
- En uso: `GET /api/test-db-connection`, `POST /api/auth/login` (`{ email, password }`) y `POST /api/auth/register` (`{ name, email, password }`).
- Definidos pero sin usar todavía: `/api/status`, `/api/auth/forgot-password` y `/api/auth/me`.

(Propuesta) Endpoints que compartirían la app y el portal, con el mismo JSON de [Contrato de datos](contrato-datos.md):

```text
GET|POST        /api/stops              GET|PUT|DELETE /api/stops/:id
GET|POST        /api/circuits           GET|PUT|DELETE /api/circuits/:id
GET|POST        /api/circuits/:id/group-sessions
PUT|DELETE      /api/group-sessions/:id
GET|POST        /api/events             GET|PUT|DELETE /api/events/:id
GET|POST        /api/coupons            GET|PUT|DELETE /api/coupons/:id
GET|POST        /api/places             GET|PUT|DELETE /api/places/:id
GET             /api/guides             GET /api/guides/:id
POST            /api/bookings           (app)      GET /api/bookings?circuitId=&from=&to=   (portal)
POST            /api/visit-events       (app, en lote)
GET             /api/analytics/stops/:id/presence?from=&to=
GET             /api/analytics/stops/:id/check-ins?from=&to=
GET             /api/analytics/stops/:id/drops?from=&to=
GET             /api/organizations/me
```

En la API, las fechas de los eventos de visita deberían llevar la zona horaria (`-06:00`) y los horarios de grupo una fecha absoluta en lugar de `daysFromNow`.
