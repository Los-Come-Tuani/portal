---
icon: lucide/layout-grid
---

# Qué debe manejar el portal

## Acceso

- Login con correo y contraseña, y recuperar contraseña. (Propuesta) Solicitud de registro de una organización, que aprueba el admin.
- La app ya llama a `POST /api/auth/login` y `POST /api/auth/register`, y manda el token Bearer en las llamadas siguientes. También tiene definidas, sin usar todavía, `/api/auth/forgot-password` y `/api/auth/me`. El portal debería usar los mismos endpoints (ver [API](api.md)).
- En modo demo, cuentas de prueba por rol (ver [Datos mock y cuentas demo](datos-demo.md)).
- Menú lateral según el rol.

## Inicio (dashboard por rol)

- **Negocio**: personas esperadas hoy y mañana por franja horaria, llegadas confirmadas con QR en los últimos 7 días, las razones principales por las que lo dejan y avisos útiles (por ejemplo "Falta tu horario" o "'Estaba cerrado' es la razón más común").
- **Alcaldía**: visitas planeadas en la ciudad para los próximos 7 días, paradas más visitadas y más abandonadas, ocupación de los horarios de grupo de sus circuitos creativos, próximos eventos y avisos de calidad de datos (paradas sin horario o sin fotos, circuitos cuyas horas de salida chocan con horarios de cierre).
- **Startup**: próximas reservas de sus circuitos, personas, ingreso estimado y abandonos en sus circuitos.

## Paradas

- Tabla con buscador y filtros: ciudad, categoría, con o sin insignia, con o sin horario.
- Formulario: nombre, categoría (sólo las 5 de [categorías y listas](reglas-negocio.md)), ciudad, dirección, coordenadas **eligiendo el punto en un mapa**, horario de apertura y cierre (o "no cierra"), tiempo sugerido de visita, si da insignia, descripción, tip para el visitante e imágenes (URLs por ahora; la primera es la portada).
- Vista previa de cómo se ve la ficha en la app.
- En qué circuitos aparece la parada.
- Calificación y número de reseñas: sólo lectura, los generan los turistas.

## Códigos QR

- Cada parada tiene un QR con el texto exacto `kplan:stop:<stopId>`, por ejemplo `kplan:stop:granada-catedral`. La app sólo acepta ese formato, y sólo en la ficha de esa misma parada (`lib/src/core/utils/qr_codes.dart`).
- El portal genera un **cartel imprimible** por parada (PNG o PDF con el logo de K'Plan, el nombre del lugar y una instrucción como "Escanéame con K'Plan") y permite descargar varios a la vez.
- Aunque la parada no dé insignia, su QR confirma la visita y cuenta para la analítica.

## Circuitos y circuitos creativos

- Tabla de circuitos. Los creativos llevan el distintivo dorado "Circuito creativo".
- Editor:
  - Datos: título largo, título corto, subtítulo, categoría, ciudad, dificultad, descripción, recomendaciones, punto de encuentro (texto y punto en el mapa), qué incluye, notas e imágenes.
  - Paradas: elegir entre las paradas **de la misma ciudad** y ordenarlas arrastrando. Opcionalmente, un traslado fijo hacia una parada (`legMinutes`, por ejemplo 0 minutos al bajar del ferry en Ometepe).
  - Transporte (a pie o en vehículo) y horas de salida (`startTimes`).
  - Precio por adulto y por niño en C$ (0 = gratis).
  - Sólo para alcaldías: marcarlo como circuito creativo, con `organizer` igual al nombre de la alcaldía.
- **Vista previa del itinerario** con el mismo cálculo que la app (ver [el planificador de itinerarios](reglas-negocio.md)): hora de llegada y de salida en cada parada para cada hora de salida, traslados ("A pasos", "10 min a pie", "25 min en vehículo") y avisos (tramo largo a pie, llega con el lugar cerrado, termina de noche). Si una hora de salida genera avisos de horario, el portal no debería dejar publicarla: la app tiene un test que exige que ninguna hora de salida del catálogo los genere.
- Mapa con las paradas numeradas en orden y un pin de inicio en el punto de encuentro.
- El portal **calcula** `duration`, `durationShort`, `badges` y `badgesNote`; no se escriben a mano (ver [campos calculados del circuito](reglas-negocio.md)).

## Horarios de grupo (circuitos creativos)

- Lista o calendario de horarios por circuito creativo: fecha, hora (una de las `startTimes` del circuito), guía, cupo, inscritos, lugares libres, si incluye transporte y la nota del guía.
- Ocupación por horario y por circuito.
- En la app los publican los guías (simulado). (Propuesta) En el MVP la alcaldía sólo los ve; crear horarios en nombre de un guía queda para la fase 2.

## Eventos

- Formulario: título, categoría (en los datos: Tradición, Feria, Cultura), fecha, ciudad y departamento (`location`, por ejemplo "León, León"), dirección, punto en el mapa, precio (0 = entrada libre), descripción e imágenes.
- `dateLabel` ("7 dic") se deriva de la fecha.

## Cupones

- Formulario: título, descripción, etiqueta corta del beneficio ("10% de descuento", "Gratis", "Regalo"), costo en insignias e imagen.
- Hoy todos los cupones son de K'Plan (descuentos en reservas, kit de bienvenida, paseo en lancha). Canjear sólo descuenta insignias y la app dice "Muéstralo al reservar": **no hay código ni validación**.
- (Propuesta, fase 2) Cupones de cada negocio, un código único por canje y una pantalla "Validar cupón" en el portal.

## Lugares destacados

- (Admin) Lista corta de tarjetas del home: nombre, ubicación ("Catarina, Masaya") e imagen.

## Analítica de visitas

Es lo más valioso del portal para alcaldías y negocios. Sale de los [eventos de visita](eventos-visita.md):

- **Afluencia esperada** (la app las llama "oleadas"): personas que se esperan en un lugar por franja horaria y por día, a partir de las visitas planeadas. Mapa de calor día × hora, gráfico de barras de un día y la lista de grupos (hora de llegada, tamaño, circuito).
- **Llegadas reales**: check-ins con QR por día y por hora.
- **Cumplimiento**: llegadas entre visitas planeadas, por lugar y por circuito.
- **Abandonos**: razones, en qué momento se dejó la parada (al planear, durante el viaje, al finalizar) y su evolución en el tiempo.
- (Propuesta) **Puntualidad**: diferencia entre la hora planeada y la hora real del check-in.
- Filtros por rango de fechas, ciudad, parada y circuito. Exportar a CSV.

## Reservas

- Reservas de los circuitos de la organización: fecha, hora, adultos, niños, horario de grupo si aplica e ingreso estimado (precio por persona × personas; el 20 % de servicio es de K'Plan). Hoy las reservas sólo viven en el teléfono, así que en el portal serán mock hasta que exista la API.

## Guías

- (Alcaldía y admin) Catálogo de guías y traductores: idiomas, rol (guía, traductor o ambos), vehículo propio, experiencia, especialidades, calificación y reseñas. (Propuesta, fase 2) Certificación de guías.

## Exportar el catálogo (propuesta, muy útil mientras no haya backend)

- Un botón para descargar `stops.json`, `circuits.json`, `events.json`, `coupons.json`, `places.json` y `circuit_groups.json` con el formato exacto de la app. Copiándolos a `mobile/assets/mock/`, lo que se edita en el portal aparece en la app sin backend.

## Prioridades

- **Fase 1 (MVP)**: tema y layout, login demo por rol, capa de datos con mocks y persistencia en `localStorage`, paradas (CRUD y mapa), QR imprimibles, circuitos (CRUD, vista previa del itinerario y mapa), eventos, analítica de visitas con datos generados, dashboard por rol y exportar el catálogo.
- **Fase 2**: horarios de grupo, cupones de negocios con validación, reservas, guías y certificación, lugares destacados, aprobación de organizaciones y varios usuarios por organización.
- **Fase 3**: conectar la API real.
