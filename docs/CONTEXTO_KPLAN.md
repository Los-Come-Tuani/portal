# K'Plan: contexto para construir el portal web

Este documento es para el agente que construye el portal en `c:\coding\kplan2\portal`. Explica la app móvil que ya existe (`c:\coding\kplan2\mobile`), el formato de datos que comparten y lo que el portal tiene que manejar. Se armó leyendo el código de la app (último commit `75ad5fa`, 25 sep 2026).

> Lo marcado como **(propuesta)** no existe en la app: es una recomendación para el portal y se puede cambiar. Todo lo demás sale del código. Las decisiones que conviene confirmar con el equipo están en la sección 14.

---

## 1. Resumen

- **K'Plan** es una app móvil (Flutter) de turismo en **Nicaragua**. El turista descubre circuitos, paradas y eventos, arma sus propios circuitos, agenda, contrata guía o traductor y recorre con un itinerario que calcula a qué hora llega a cada lugar. En cada parada escanea un **código QR** y gana **insignias**, que suben **medallas** y se canjean por **cupones**.
- El **portal web** es para las organizaciones: **alcaldías, negocios y startups** (así lo define `portal/README.md`). Sirve para dos cosas:
  1. **Crear y mantener el contenido que ve el turista**: paradas, circuitos, circuitos creativos oficiales, eventos, cupones y los códigos QR que se imprimen en cada lugar.
  2. **Ver lo que hacen los turistas**: cuántas personas llegarán a cada lugar y a qué hora, quién llegó de verdad (escaneó el QR) y quién no llegó y por qué.
- **No hay backend todavía.** La app funciona con JSON de prueba y estado en memoria. El portal debe arrancar igual: una capa de datos con esos mismos JSON, lista para cambiarse por una API.
- El portal **escribe lo que la app lee**, así que ambos usan el mismo formato JSON, campo por campo. Algunos formatos son delicados (horas como `"8:30 a.m."`, duraciones como `"1 h 30 min"`, coordenadas en `location` o en `coordinates` según la entidad): ver la sección 7.
- El proyecto del portal ya está creado, vacío: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Oxlint. Interfaz en **español**, dinero en **córdobas** (`C$ 250`), horas de **America/Managua** (UTC−6, sin horario de verano). La marca se escribe **K'Plan**, con apóstrofo.

---

## 2. La app móvil

### 2.1 Qué hace el turista

| Función | Qué es |
|---|---|
| Descubrir | Home con pestañas (Para ti, circuitos, paradas filtrables por categoría), lugares destacados y eventos próximos, con buscador. |
| Detalle de circuito | Galería, descripción, paradas en orden, itinerario con la hora de llegada a cada parada según la hora de salida elegida, mapa, reseñas, punto de encuentro, qué incluye, recomendaciones e insignias que contiene. |
| Mis circuitos | Funcionan como playlists: el turista añade paradas a circuitos o crea los suyos, y elige hora de salida, transporte (a pie o en vehículo) y ritmo (relajado, equilibrado o intenso). Al quitar una parada se le pregunta por qué. |
| Asistente de itinerarios | "IA" simulada con reglas fijas. Pregunta ciudad, ritmo, transporte, hora e intereses, arma el día y sugiere cambios: ir en vehículo, reordenar, salir más tarde, quitar una parada cerrada o que no cabe, **almorzar en un lugar de Gastronomía** o agregar una parada. |
| Agendar | Para circuitos privados (del catálogo o propios): fecha, hora de salida, adultos y niños; precio por persona más 20 % de servicio. Opcionalmente publica una propuesta de trabajo para guía y/o traductor. |
| Guía o traductor | Los guías se postulan a la propuesta (simulado), el turista compara perfiles, contrata y chatea (simulado). |
| Circuitos creativos | Circuitos oficiales de una alcaldía. No se agendan en privado: el turista se inscribe con su grupo en un **horario de grupo** publicado por un guía certificado, con cupo limitado. Completarlo da 3 insignias extra y la medalla de esa ciudad. |
| Viaje en curso | Sigue el itinerario: siguiente parada, hora estimada de llegada y atraso. Cada parada se confirma escaneando su QR. Se pueden saltar paradas (con razón) y, al finalizar, se pregunta por las pendientes. |
| Insignias, medallas y cupones | Escanear el QR de una parada con insignia da una insignia de su categoría (una vez por parada). Las insignias acumuladas suben medallas (bronce, plata, oro) y el saldo se gasta en cupones. |

### 2.2 Estado técnico

- Flutter con MVVM y repositorios, Provider, go_router y dio.
- `ApiClient.baseUrl` está vacío, así que todo corre en **modo demo**: el login acepta cualquier correo, el catálogo sale de `assets/mock/*.json`, y las reservas, circuitos propios, insignias y eventos de visita viven en memoria (se pierden al cerrar la app).
- Está simulado: el login, las postulaciones de guías, el chat con el guía y el asistente de itinerarios.
- **No existe una app para guías.** Las postulaciones y los horarios de grupo salen de datos fijos.

---

## 3. Quién usa el portal

La app no tiene el concepto de "dueño" de una parada o de un circuito: el portal lo agrega.

| Rol | Ejemplos | Alcance | Qué maneja |
|---|---|---|---|
| Alcaldía | Alcaldía de León, de Masaya, de Estelí (aparecen como `organizer` en los datos) | Su ciudad (`city`) | Paradas públicas de su ciudad, **circuitos creativos**, eventos de su ciudad, horarios de grupo de sus circuitos creativos y la analítica de toda la ciudad |
| Negocio | Restaurante, museo, tabacalera, finca cafetalera, mercado | Sus paradas | La ficha de su lugar (sobre todo el **horario**), su QR, la analítica de su lugar y (propuesta) cupones propios |
| Startup (propuesta de interpretación) | Operador turístico o emprendimiento | Sus circuitos | Circuitos privados del catálogo (con precio por persona), sus reservas y su analítica |
| Admin K'Plan (propuesta) | Equipo de K'Plan | Todo | Aprobar organizaciones y paradas nuevas, cupones de K'Plan, lugares destacados y analítica global |

Cómo encaja con los datos actuales:

- Los 3 circuitos creativos (`leon-colonial`, `masaya-artesanias-volcan`, `esteli-murales-tabaco`) tienen `organizer: "Alcaldía de …"`.
- Los otros 3 (`granada-historias-sabores`, `isla-de-ometepe`, `ruta-del-cafe`) no dicen quién los creó: son candidatos a pertenecer a una startup (o a K'Plan).
- Varias paradas son negocios: `esteli-tabacalera` (tabacalera artesanal), `cafe-beneficio`, `cafe-secado`, `cafe-tueste` y `cafe-cata` (una finca cafetalera), `cafe-selva-negra` (Finca Selva Negra), `leon-mercado` (Mercado La Terminal), `masaya-mercado-artesanias`.
- (Propuesta) Una alcaldía edita las paradas de su ciudad que no pertenecen a un negocio, y ve la analítica de todas las paradas de su ciudad.

---

## 4. Glosario

| Término | Qué es |
|---|---|
| Parada (`Stop`) | Un lugar concreto que se visita: catedral, mercado, mirador, restaurante. Vive aparte de los circuitos porque una misma parada puede estar en varios. |
| Circuito (`Circuit`) | Recorrido ordenado de paradas **de una misma ciudad**, con horas de salida, precio por adulto y por niño, punto de encuentro, qué incluye, etc. Es privado: cada grupo agenda el suyo. |
| Circuito creativo | Circuito oficial creado por una alcaldía (`isCreativeCircuit: true`). Sus paradas no se cambian y se hace en grupo, inscribiéndose en un horario de grupo. Da 3 insignias extra y la medalla de la ciudad. |
| Horario de grupo (`CircuitGroupSession`) | Fecha y hora en que un guía certificado hace un circuito creativo, con cupo (`capacity`), inscritos (`joinedCount`), si incluye transporte y una nota del guía. |
| Circuito propio | Circuito armado por el turista (en la app, `CircuitCollection` con `isUserCreated`). No tiene precio por persona: sólo paga al guía si contrata uno. Su id empieza con `user-circuit-`. |
| Itinerario | La hora de llegada y de salida en cada parada, calculada con la hora de salida, el tiempo sugerido de cada parada, los traslados, el ritmo y el transporte. |
| Ritmo | Relajado, equilibrado o intenso: cambia el tiempo en cada parada y cuánto puede durar el día. |
| Insignia | Se gana al escanear el QR de una parada con `hasBadge: true`, en la categoría de esa parada. Una vez por parada. |
| Medalla | Nivel (bronce, plata, oro) según las insignias acumuladas, por categoría y general. |
| Medalla de ciudad | Se gana al completar un circuito creativo de esa ciudad (QR en todas sus paradas). |
| Cupón | Beneficio que se canjea con insignias del saldo. |
| Propuesta de trabajo (`GuideRequest`) | Lo que publica el turista al agendar si quiere guía y/o traductor. Los guías se postulan (`GuideApplication`) y él elige a quién contratar. |
| Evento de visita (`VisitEvent`) | Lo que la app registra para el portal: visita planeada, check-in con QR o parada dejada con su razón. |
| Evento (`EventItem`) | Actividad con fecha en una ciudad: fiestas, ferias, festivales. |
| Lugar destacado (`Place`) | Tarjeta simple del home: nombre, ubicación e imagen. |

---

## 5. Qué debe manejar el portal

### 5.1 Acceso

- Login con correo y contraseña, y recuperar contraseña. (Propuesta) Solicitud de registro de una organización, que aprueba el admin.
- La app ya llama a `POST /api/auth/login` y `POST /api/auth/register`, y manda el token Bearer en las llamadas siguientes. También tiene definidas, sin usar todavía, `/api/auth/forgot-password` y `/api/auth/me`. El portal debería usar los mismos endpoints (sección 13).
- En modo demo, cuentas de prueba por rol (sección 10).
- Menú lateral según el rol.

### 5.2 Inicio (dashboard por rol)

- **Negocio**: personas esperadas hoy y mañana por franja horaria, llegadas confirmadas con QR en los últimos 7 días, las razones principales por las que lo dejan y avisos útiles (por ejemplo "Falta tu horario" o "'Estaba cerrado' es la razón más común").
- **Alcaldía**: visitas planeadas en la ciudad para los próximos 7 días, paradas más visitadas y más abandonadas, ocupación de los horarios de grupo de sus circuitos creativos, próximos eventos y avisos de calidad de datos (paradas sin horario o sin fotos, circuitos cuyas horas de salida chocan con horarios de cierre).
- **Startup**: próximas reservas de sus circuitos, personas, ingreso estimado y abandonos en sus circuitos.

### 5.3 Paradas

- Tabla con buscador y filtros: ciudad, categoría, con o sin insignia, con o sin horario.
- Formulario: nombre, categoría (sólo las 5 de la sección 8.1), ciudad, dirección, coordenadas **eligiendo el punto en un mapa**, horario de apertura y cierre (o "no cierra"), tiempo sugerido de visita, si da insignia, descripción, tip para el visitante e imágenes (URLs por ahora; la primera es la portada).
- Vista previa de cómo se ve la ficha en la app.
- En qué circuitos aparece la parada.
- Calificación y número de reseñas: sólo lectura, los generan los turistas.

### 5.4 Códigos QR

- Cada parada tiene un QR con el texto exacto `kplan:stop:<stopId>`, por ejemplo `kplan:stop:granada-catedral`. La app sólo acepta ese formato, y sólo en la ficha de esa misma parada (`lib/src/core/utils/qr_codes.dart`).
- El portal genera un **cartel imprimible** por parada (PNG o PDF con el logo de K'Plan, el nombre del lugar y una instrucción como "Escanéame con K'Plan") y permite descargar varios a la vez.
- Aunque la parada no dé insignia, su QR confirma la visita y cuenta para la analítica.

### 5.5 Circuitos y circuitos creativos

- Tabla de circuitos. Los creativos llevan el distintivo dorado "Circuito creativo".
- Editor:
  - Datos: título largo, título corto, subtítulo, categoría, ciudad, dificultad, descripción, recomendaciones, punto de encuentro (texto y punto en el mapa), qué incluye, notas e imágenes.
  - Paradas: elegir entre las paradas **de la misma ciudad** y ordenarlas arrastrando. Opcionalmente, un traslado fijo hacia una parada (`legMinutes`, por ejemplo 0 minutos al bajar del ferry en Ometepe).
  - Transporte (a pie o en vehículo) y horas de salida (`startTimes`).
  - Precio por adulto y por niño en C$ (0 = gratis).
  - Sólo para alcaldías: marcarlo como circuito creativo, con `organizer` igual al nombre de la alcaldía.
- **Vista previa del itinerario** con el mismo cálculo que la app (sección 8.3): hora de llegada y de salida en cada parada para cada hora de salida, traslados ("A pasos", "10 min a pie", "25 min en vehículo") y avisos (tramo largo a pie, llega con el lugar cerrado, termina de noche). Si una hora de salida genera avisos de horario, el portal no debería dejar publicarla: la app tiene un test que exige que ninguna hora de salida del catálogo los genere.
- Mapa con las paradas numeradas en orden y un pin de inicio en el punto de encuentro.
- El portal **calcula** `duration`, `durationShort`, `badges` y `badgesNote`; no se escriben a mano (reglas en la sección 8.2).

### 5.6 Horarios de grupo (circuitos creativos)

- Lista o calendario de horarios por circuito creativo: fecha, hora (una de las `startTimes` del circuito), guía, cupo, inscritos, lugares libres, si incluye transporte y la nota del guía.
- Ocupación por horario y por circuito.
- En la app los publican los guías (simulado). (Propuesta) En el MVP la alcaldía sólo los ve; crear horarios en nombre de un guía queda para la fase 2.

### 5.7 Eventos

- Formulario: título, categoría (en los datos: Tradición, Feria, Cultura), fecha, ciudad y departamento (`location`, por ejemplo "León, León"), dirección, punto en el mapa, precio (0 = entrada libre), descripción e imágenes.
- `dateLabel` ("7 dic") se deriva de la fecha.

### 5.8 Cupones

- Formulario: título, descripción, etiqueta corta del beneficio ("10% de descuento", "Gratis", "Regalo"), costo en insignias e imagen.
- Hoy todos los cupones son de K'Plan (descuentos en reservas, kit de bienvenida, paseo en lancha). Canjear sólo descuenta insignias y la app dice "Muéstralo al reservar": **no hay código ni validación**.
- (Propuesta, fase 2) Cupones de cada negocio, un código único por canje y una pantalla "Validar cupón" en el portal.

### 5.9 Lugares destacados

- (Admin) Lista corta de tarjetas del home: nombre, ubicación ("Catarina, Masaya") e imagen.

### 5.10 Analítica de visitas

Es lo más valioso del portal para alcaldías y negocios. Sale de los eventos de visita (sección 9):

- **Afluencia esperada** (la app las llama "oleadas"): personas que se esperan en un lugar por franja horaria y por día, a partir de las visitas planeadas. Mapa de calor día × hora, gráfico de barras de un día y la lista de grupos (hora de llegada, tamaño, circuito).
- **Llegadas reales**: check-ins con QR por día y por hora.
- **Cumplimiento**: llegadas entre visitas planeadas, por lugar y por circuito.
- **Abandonos**: razones, en qué momento se dejó la parada (al planear, durante el viaje, al finalizar) y su evolución en el tiempo.
- (Propuesta) **Puntualidad**: diferencia entre la hora planeada y la hora real del check-in.
- Filtros por rango de fechas, ciudad, parada y circuito. Exportar a CSV.

### 5.11 Reservas

- Reservas de los circuitos de la organización: fecha, hora, adultos, niños, horario de grupo si aplica e ingreso estimado (precio por persona × personas; el 20 % de servicio es de K'Plan). Hoy las reservas sólo viven en el teléfono, así que en el portal serán mock hasta que exista la API.

### 5.12 Guías

- (Alcaldía y admin) Catálogo de guías y traductores: idiomas, rol (guía, traductor o ambos), vehículo propio, experiencia, especialidades, calificación y reseñas. (Propuesta, fase 2) Certificación de guías.

### 5.13 Exportar el catálogo (propuesta, muy útil mientras no haya backend)

- Un botón para descargar `stops.json`, `circuits.json`, `events.json`, `coupons.json`, `places.json` y `circuit_groups.json` con el formato exacto de la app. Copiándolos a `mobile/assets/mock/`, lo que se edita en el portal aparece en la app sin backend.

---

## 6. Prioridades

- **Fase 1 (MVP)**: tema y layout, login demo por rol, capa de datos con mocks y persistencia en `localStorage`, paradas (CRUD y mapa), QR imprimibles, circuitos (CRUD, vista previa del itinerario y mapa), eventos, analítica de visitas con datos generados, dashboard por rol y exportar el catálogo.
- **Fase 2**: horarios de grupo, cupones de negocios con validación, reservas, guías y certificación, lugares destacados, aprobación de organizaciones y varios usuarios por organización.
- **Fase 3**: conectar la API real.

---

## 7. Contrato de datos

Los tipos reflejan campo por campo los JSON de `mobile/assets/mock/`. Para confirmar un detalle, el parser de cada entidad está en `mobile/lib/src/data/models/`.

```ts
/** "8:30 a.m." | "12:00 p.m." | "3:00 p.m.": 12 horas, sin cero a la izquierda */
type ClockTime = string;
/** "30 min" | "2 h" | "1 h 30 min" */
type DurationText = string;

type StopCategory = 'Historia' | 'Cultura' | 'Gastronomía' | 'Naturaleza' | 'Aventura';
type TravelMode = 'walking' | 'vehicle';

interface LatLng { latitude: number; longitude: number }

/** stops.json */
interface Stop {
  id: string;                  // "granada-catedral"
  name: string;
  category: StopCategory;
  city: string;                // "Granada"; sólo se combinan paradas de la misma ciudad
  address: string;
  opensAt?: ClockTime;         // los dos o ninguno; sin horario = no cierra (parque, calle, mirador)
  closesAt?: ClockTime;
  duration: DurationText;      // tiempo sugerido de visita
  rating: number;              // 0–5, lo generan los turistas
  reviewsCount: number;
  hasBadge: boolean;           // su QR da una insignia de su categoría
  description: string;
  tip: string;                 // recomendación corta para el visitante
  images: string[];            // URLs; la primera es la portada
  coordinates: LatLng;         // en paradas y eventos se llama "coordinates"
}

/** circuits.json */
interface Circuit {
  id: string;                  // "granada-historias-sabores"
  title: string;               // largo, para el detalle
  shortTitle: string;          // corto, para las tarjetas
  subtitle: string;
  category: string;            // en los datos: "Ciudad" | "Naturaleza"
  city: string;
  rating: number;
  reviewsCount: number;
  stopIds: string[];           // en orden de visita
  travelMode: TravelMode;      // el portal siempre lo escribe (si falta, la app asume "walking")
  legMinutes?: Record<string, number>; // traslado fijo hacia una parada: { "ometepe-moyogalpa": 0 }
  duration: string;            // calculado: "4 h 20 min"
  durationShort: string;       // calculado: "4 h aprox." | "1 día"
  badges: number;              // calculado: paradas con hasBadge
  difficulty: string;          // en los datos: "Fácil" | "Moderado"
  priceAdult: number;          // C$
  priceChild: number;          // C$; 0 = gratis
  description: string;
  images: string[];
  recommendations: string;
  meetingPoint: string;        // texto del punto de encuentro
  location: LatLng;            // coordenadas del punto de encuentro (en circuitos se llama "location"; 0,0 = sin punto)
  includes: string;
  badgesNote: string;          // calculado
  notes: string;
  startTimes: ClockTime[];
  comments: CircuitComment[];
  isCreativeCircuit?: boolean; // circuito oficial de una alcaldía
  organizer?: string;          // "Alcaldía de León"; sólo en creativos
}

/** timeAgo es texto ("Hace dos días"); en la API debería ser una fecha */
interface CircuitComment { author: string; rating: number; timeAgo: string; text: string }

/** circuit_groups.json */
interface CircuitGroupSession {
  id: string;                  // "group-leon-1"
  circuitId: string;           // siempre un circuito creativo
  daysFromNow: number;         // SÓLO en el mock, fecha relativa a hoy. En la API: date "YYYY-MM-DD"
  startTime: ClockTime;
  capacity: number;
  joinedCount: number;
  guideId: string;
  transportIncluded: boolean;
  note: string;                // mensaje del guía para quienes se inscriben
}

/** events.json */
interface EventItem {
  id: string;
  title: string;
  location: string;            // texto: "León, León" (ciudad, departamento)
  date: string;                // "2026-12-07"
  dateLabel: string;           // "7 dic", se deriva de date
  image: string;               // portada de la tarjeta
  category: string;            // en los datos: "Tradición" | "Feria" | "Cultura"
  address: string;
  description: string;
  images: string[];
  price: number;               // 0 = entrada libre
  coordinates: LatLng;
}

/** places.json (lugares destacados del home) */
interface Place { id: string; name: string; location: string; image: string }

/** coupons.json */
interface Coupon {
  id: string;
  title: string;
  description: string;
  discountLabel: string;       // "10% de descuento" | "Gratis" | "Regalo"
  cost: number;                // en insignias
  image: string;
}

/** guides.json */
interface TourGuide {
  id: string;                  // "guide-marlene"
  name: string;
  photoUrl: string;
  rating: number;
  reviewsCount: number;
  languages: string[];         // "Español", "Inglés", "Francés", "Alemán", "Portugués", "Italiano"
  bio: string;
  yearsExperience: number;
  specialties: string[];
  role: 'guide' | 'translator' | 'both';
  hasTransport: boolean;
  reviews: { author: string; rating: number; timeAgo: string; text: string }[];
}

/** Hoy sólo vive en memoria en el teléfono. Propuesta de formato para la API */
interface Booking {
  id: string;
  circuitId: string;           // del catálogo o "user-circuit-…"
  circuitTitle: string;
  date: string;                // "YYYY-MM-DD"
  startTime: ClockTime;
  adults: number;
  children: number;
  isUserCircuit: boolean;
  groupSessionId?: string;     // si se inscribió en un horario de grupo
}
```

### 7.1 Formatos que la app parsea

Si un valor no cumple el formato, la app no falla: lo ignora en silencio. Por eso el portal tiene que validarlos.

| Dato | Formato | Ejemplos | Si viene mal |
|---|---|---|---|
| Horas (`opensAt`, `closesAt`, `startTimes`, `startTime`) | `h:mm a.m.` o `h:mm p.m.` | `"8:30 a.m."`, `"12:00 p.m."`, `"3:00 p.m."` | El horario de la parada se descarta y se trata como si nunca cerrara; una hora de salida se toma como medianoche |
| Duración de una parada (`duration`) | `N min`, `N h` o `N h M min` | `"30 min"`, `"1 h 30 min"` | Se usan 30 minutos |
| Fecha de un evento (`date`) | `YYYY-MM-DD` | `"2026-12-07"` | Se usa la fecha de hoy |
| Coordenadas | `{ "latitude": …, "longitude": … }` | `{ "latitude": 11.9299, "longitude": -85.9561 }` | Quedan en 0,0 |
| IDs | slug en minúsculas, kebab-case, ASCII | `granada-catedral` | Evitar tildes: el mock tiene `gritería-2026` |

- La app lee las horas con la expresión `^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$` sobre el texto en minúsculas. El portal debe escribir siempre la forma canónica: `8:30 a.m.`.
- `opensAt` y `closesAt` van juntos o no van. `closesAt` debe ser posterior a `opensAt`: el modelo no soporta cerrar pasada la medianoche, ni horarios distintos por día de la semana.
- Las coordenadas se llaman `coordinates` en paradas y eventos, y `location` en circuitos (ahí son el punto de encuentro). En eventos, `location` es un texto.

### 7.2 Formatos de presentación

Mismos textos que la app (`lib/src/core/utils/formatters.dart`), para que el portal y la app se lean igual:

| Qué | Formato |
|---|---|
| Dinero | `C$ 250` (sin decimales) |
| Hora | `8:30 a.m.`, `2:05 p.m.` |
| Franja | `8:30 – 9:00 a.m.`; si cruza el mediodía, `11:40 a.m. – 12:10 p.m.` |
| Duración | `4 h 20 min`, `45 min`, `3 h` |
| Fecha | `Sábado 26 sep`, `16 nov 2026`, `16 nov` (meses abreviados en minúscula) |
| Distancia | `800 m`, `2.2 km` |
| Personas | `1 persona`, `4 personas` |

---

## 8. Reglas de negocio

### 8.1 Categorías y listas

- Categorías de parada, lista cerrada: **Historia, Cultura, Gastronomía, Naturaleza, Aventura**. La app tiene íconos, filtros y medallas por categoría: agregar una nueva requiere cambiar la app.
- Categorías de insignia: esas 5 más **Circuitos creativos**.
- Categorías de circuito en los datos: Ciudad y Naturaleza. Colores de sus etiquetas en la app: Ciudad `#2B8FD1`, Naturaleza `#0E9AA7`, Cultura `#7B5EA7`; cualquier otra usa el terracota de la marca.
- Dificultad en los datos: Fácil y Moderado.
- Ciudades en los datos: Granada, Rivas (las paradas de Ometepe), León, Matagalpa, Masaya y Estelí. `city` decide qué paradas se combinan en un circuito y de qué ciudad es cada medalla.

### 8.2 Campos calculados del circuito

- `badges`: número de paradas del circuito con `hasBadge: true`. Hoy `isla-de-ometepe` dice 4, pero sólo 3 de sus paradas tienen insignia: por eso conviene calcularlo.
- `badgesNote`: `Este recorrido contiene un total de {badges} insignias coleccionables`. En los creativos se agrega `, más 3 insignias extra de "Circuitos creativos" y una medalla de {city} al completarlo`.
- `duration`: duración total del itinerario con ritmo equilibrado y el `travelMode` del circuito, formateada (`4 h 20 min`). No depende de la hora de salida.
- `durationShort` (regla deducida de los datos): `1 día` si dura 8 h o más; si no, las horas redondeadas más ` aprox.` (4 h 20 min da `4 h aprox.`; 6 h 45 min da `7 h aprox.`).
- Todas las paradas deben tener la misma `city` que el circuito.

### 8.3 Planificador de itinerarios (portar a TypeScript tal cual)

Fuente: `mobile/lib/src/core/utils/itinerary_planner.dart`. No usa un servicio de rutas: estima cada traslado con la distancia en línea recta.

- Distancia: fórmula del haversine (radio 6371 km) multiplicada por 1.3, porque las calles no van en línea recta.
- Traslado entre dos paradas (los umbrales se comparan con la distancia ya multiplicada por 1.3):
  - Menos de 0.15 km: "A pasos", 0 minutos.
  - A pie, o hasta 1 km aunque el circuito sea en vehículo: a 4.5 km/h.
  - En vehículo: a 30 km/h, más 5 minutos por subir, bajar y estacionar.
  - Los minutos se redondean hacia arriba a múltiplos de 5, con un mínimo de 5.
  - `legMinutes` fija el traslado a mano, tal cual y sin redondear; con 0 se muestra "Sin traslado".
- Tiempo en cada parada: la `duration` de la parada (30 min si no se entiende) por el factor del ritmo, redondeado a múltiplos de 5 (mínimo 5), más la holgura.

| Ritmo | Factor | Holgura por parada | Día máximo |
|---|---|---|---|
| Relajado | 1.25 | 10 min | 6 h |
| Equilibrado | 1 | 0 | 8 h |
| Intenso | 0.85 | 0 | 10 h |

- Avisos: un tramo a pie de más de 2 km; llegar cuando ya cerró, salir después del cierre o llegar antes de que abra; terminar el día después de las 6:30 p.m.
- Valores de referencia del test de la app (`mobile/test/itinerary_planner_test.dart`), que el port debe reproducir:
  - `granada-historias-sabores` saliendo a las 8:30 a.m.: `8:30 – 9:00 a.m.`, `9:00 – 9:25 a.m.` ("A pasos"), `9:35 – 10:15 a.m.` ("10 min a pie"), `10:25 – 11:00 a.m.`, `11:10 – 11:40 a.m.` y `12:10 – 12:50 p.m.`. Total 4 h 20 min, con un solo aviso: tramo largo (2.2 km a pie) hacia `granada-muelle`.
  - `isla-de-ometepe` saliendo a las 6:00 a.m.: Moyogalpa `7:00 – 7:30 a.m.` ("Sin traslado"); termina a las 3:50 p.m., sin avisos.
  - `leon-colonial` saliendo a las 7:00 a.m.: aviso de que `leon-catedral` abre a las 8:00 a.m.
  - Tiempo en `granada-catedral` (30 min): equilibrado 30, relajado 50, intenso 25.
  - La `duration` publicada de cada circuito coincide con el cálculo para todas sus `startTimes`, sin avisos de horario.

### 8.4 Reservas y precios

- Circuitos privados del catálogo: precio por adulto y por niño; al subtotal se le suma un **20 % de servicio**. Se agenda con al menos 1 día de anticipación y hasta 365 días, con 0 a 20 adultos y 0 a 20 niños.
- Circuitos propios: sin precio por persona; horas de salida de 7:00 a.m. a 3:00 p.m., cada hora.
- Circuitos creativos: no se agendan en privado. El grupo se inscribe en un horario si cabe en los lugares libres (`capacity - joinedCount`); paga el precio por persona más el 20 %.

### 8.5 Guía o traductor (referencia; el portal no lo gestiona en el MVP)

- Tarifas por hora: guía local C$ 140, guía bilingüe C$ 200, traductor C$ 90. Se suma un 15 % si el guía pone el vehículo y se resta un 10 % si el servicio dura más de 24 h y el turista le da alojamiento. Mínimo 5 h con guía y 3 h sólo con traductor.
- La propuesta queda abierta 24 h y recibe hasta 3 postulaciones por puesto.

### 8.6 Insignias, medallas y cupones

- Una insignia por parada con `hasBadge`, una sola vez por turista, en la categoría de la parada.
- Medallas por categoría: bronce con 1 insignia, plata con 2 y oro con 3. Generales: bronce con 3, plata con 6 y oro con 10. Se calibraron para un catálogo de unas 11 insignias (hoy hay 15 paradas con insignia); si el portal agrega muchas más, habrá que recalibrarlas en la app.
- Completar un circuito creativo (QR en todas sus paradas) da 3 insignias de "Circuitos creativos" y la medalla de esa ciudad (una por ciudad).
- Los cupones se pagan con el saldo (insignias ganadas menos gastadas); cada cupón se canjea una vez por turista. Gastar insignias no baja las medallas.

### 8.7 Por qué a un negocio le importa su ficha

- La app avisa si el turista llegaría con el lugar cerrado, y el asistente propone quitarlo (razón "Estaba cerrado") o salir más tarde. Un horario mal cargado le quita visitas al negocio.
- Si el día del turista pasa por el mediodía (12:00 a 2:00 p.m.) y no tiene parada de **Gastronomía**, el asistente propone almorzar en la parada de Gastronomía de esa ciudad que menos traslado agregue. Los restaurantes tienen que estar como Gastronomía, con horario y coordenadas correctas.
- Al armar un día desde cero, el asistente prioriza las paradas que coinciden con los intereses del turista, las mejor calificadas y las que dan insignia.

---

## 9. Eventos de visita

Es lo que la app junta para el portal (`lib/src/data/models/visit_event.dart` y `lib/src/data/datasources/repository/visit_log_repository.dart`). Hoy se guardan en memoria; el formato es el que recibiría el backend.

### 9.1 Formato

```jsonc
// Visita planeada: al agendar o inscribirse, una por cada parada del itinerario
{ "type": "planned_visit", "stopId": "granada-catedral", "circuitId": "granada-historias-sabores",
  "bookingId": "booking-1", "arrival": "2026-09-26T09:00:00.000", "departure": "2026-09-26T09:30:00.000",
  "groupSize": 4, "recordedAt": "2026-09-25T10:00:00.000" }

// Check-in: el turista escaneó el QR de la parada, llegó de verdad.
// circuitId y groupSize son null si escaneó sin un viaje en curso
{ "type": "check_in", "stopId": "granada-catedral", "circuitId": "granada-historias-sabores",
  "groupSize": 4, "recordedAt": "2026-09-26T09:12:00.000" }

// Parada dejada, con la razón que dio el turista
{ "type": "stop_dropped", "stopId": "granada-muelle", "circuitId": "granada-historias-sabores",
  "reason": "too_far", "stage": "trip", "recordedAt": "2026-09-26T12:05:00.000" }
```

Las fechas vienen sin zona horaria: son hora local de Nicaragua. `recordedAt` es cuándo se registró el evento (por ejemplo, el día que se hizo la reserva), no la hora de la visita.

| `reason` | Texto que ve el turista |
|---|---|
| `closed` | Estaba cerrado |
| `too_far` | Muy lejos o sin transporte |
| `no_time` | Falta de tiempo |
| `too_expensive` | Muy caro |
| `not_interested` | No me interesó |
| `weather` | Por el clima |
| `other` | Otro motivo |

| `stage` | Cuándo pasa |
|---|---|
| `planning` | Al armar o ajustar su circuito: la quitó él, o aceptó la sugerencia del asistente de quitarla |
| `trip` | Durante el viaje, con "Saltar" |
| `trip_ended` | Al finalizar el viaje con la parada todavía pendiente (responder es opcional) |

### 9.2 Métricas

- **Personas presentes** en una parada durante una franja (30 o 60 min): suma de `groupSize` de las visitas planeadas cuya estancia (`arrival` a `departure`) se cruza con la franja. Es lo que un restaurante necesita para preparar personal.
- **Llegadas esperadas** por franja: suma de `groupSize` de las visitas planeadas cuya `arrival` cae en la franja.
- **Llegadas reales**: cantidad de `check_in` de la parada. Si `groupSize` es null, contar 1 persona y marcarlo como "escaneo suelto".
- **Cumplimiento** por parada, circuito y día: `min(check-ins, visitas planeadas) / visitas planeadas`.
- **Abandonos**: conteo de `stop_dropped` por `reason` y por `stage`, por parada, circuito y período.

### 9.3 Limitaciones

- Ningún evento lleva el usuario (la API lo tomaría del token) y el check-in no lleva `bookingId`, así que cruzar llegadas con visitas planeadas es aproximado.
- Si el turista deshace la eliminación de una parada, la app borra el evento: el envío a la API tendría que esperar o permitir borrarlo.
- Iniciar un viaje sin reserva genera check-ins sin visitas planeadas: puede haber más llegadas que visitas planeadas.
- No hay eventos de "circuito completado" ni de "cupón canjeado". (Propuesta) Agregarlos en la app para medir medallas de ciudad y canjes.
- `circuitId` puede ser un circuito propio de un turista (`user-circuit-…`) que no está en el catálogo: agruparlos como "Circuitos armados por turistas".
- En la app no se pueden cancelar reservas.

### 9.4 Datos de prueba para la analítica

Como los eventos sólo existen en el teléfono, el portal necesita generarlos para que la analítica tenga qué mostrar:

- Semilla fija (generador pseudoaleatorio determinista) y fechas relativas a hoy, como `daysFromNow` en el mock de la app, para que siempre haya datos pasados y próximos. Rango sugerido: últimos 60 días y próximos 14.
- Reservas: por circuito privado y día, de 0 a 3 (más los fines de semana), grupos de 1 a 8 personas (más a menudo de 2 a 4) y hora de salida al azar entre sus `startTimes`. En los creativos, repartir los inscritos de los horarios de grupo.
- Por cada reserva, calcular el itinerario con el planificador portado y generar una `planned_visit` por parada.
- En las reservas pasadas, por cada parada: alrededor de 80 % de probabilidad de `check_in`, con `recordedAt` entre 0 y 30 minutos después de la llegada planeada. Si no hubo check-in, más o menos la mitad de las veces un `stop_dropped` (etapa `trip` o `trip_ended`) con razones repartidas así: `no_time` 30 %, `too_far` 20 %, `closed` 15 %, `weather` 10 %, `not_interested` 10 %, `too_expensive` 5 %, `other` 10 %.
- Además: `stop_dropped` en etapa `planning` sobre circuitos `user-circuit-…`, y `check_in` sueltos (`circuitId: null`) en las paradas más populares.
- Dejar algún caso visible para la demo, por ejemplo una parada con muchas razones "Estaba cerrado" porque cierra temprano.

---

## 10. Datos mock y cuentas demo

Copiar los JSON de `c:\coding\kplan2\mobile\assets\mock\` al portal. Las imágenes son de `picsum.photos` (placeholders).

| Archivo | Contenido |
|---|---|
| `stops.json` | 34 paradas en 6 ciudades (Granada 6, Rivas/Ometepe 8, León 5, Matagalpa 7, Masaya 4, Estelí 4). 15 dan insignia y 12 no tienen horario |
| `circuits.json` | 6 circuitos: 3 privados (`granada-historias-sabores`, `isla-de-ometepe`, `ruta-del-cafe`) y 3 creativos de alcaldías (`leon-colonial`, `masaya-artesanias-volcan`, `esteli-murales-tabaco`) |
| `circuit_groups.json` | 8 horarios de grupo de los circuitos creativos |
| `guides.json` | 8 personas: 5 guías, 1 que es guía y traductor, 2 traductores |
| `events.json` | 4 eventos: La Gritería, Hípica de Granada, Festival de Poesía y El Torovenado |
| `places.json` | 5 lugares destacados |
| `coupons.json` | 5 cupones de K'Plan |

(Propuesta) Archivos nuevos que el portal necesita:

```jsonc
// organizations.json: quién es dueño de qué
[
  { "id": "org-alcaldia-leon", "type": "alcaldia", "name": "Alcaldía de León", "city": "León",
    "stopIds": [], "circuitIds": ["leon-colonial"] },
  { "id": "org-alcaldia-masaya", "type": "alcaldia", "name": "Alcaldía de Masaya", "city": "Masaya",
    "stopIds": [], "circuitIds": ["masaya-artesanias-volcan"] },
  { "id": "org-tabacalera-esteli", "type": "negocio", "name": "Tabacalera artesanal", "city": "Estelí",
    "stopIds": ["esteli-tabacalera"], "circuitIds": [] },
  { "id": "org-finca-cafetalera", "type": "negocio", "name": "Finca cafetalera", "city": "Matagalpa",
    "stopIds": ["cafe-beneficio", "cafe-secado", "cafe-tueste", "cafe-cata"], "circuitIds": [] },
  { "id": "org-ruta-cafe", "type": "startup", "name": "Ruta del Café Tours", "city": "Matagalpa",
    "stopIds": [], "circuitIds": ["ruta-del-cafe"] }
]
```

Cuentas demo sugeridas (cualquier contraseña, igual que el login demo de la app; el correo decide el rol):

| Correo | Rol | Organización |
|---|---|---|
| `admin@kplan.demo` | Admin K'Plan | — |
| `leon@kplan.demo` | Alcaldía | Alcaldía de León |
| `masaya@kplan.demo` | Alcaldía | Alcaldía de Masaya |
| `tabacalera@kplan.demo` | Negocio | Tabacalera artesanal (1 parada) |
| `finca@kplan.demo` | Negocio | Finca cafetalera (varias paradas) |
| `rutacafe@kplan.demo` | Startup | Ruta del Café Tours |

---

## 11. Arquitectura sugerida para el portal

Sugerencias; verificar las versiones actuales de cada librería antes de instalar.

- **Rutas**: React Router, con guardas por rol.
- **Datos**: repositorios con la misma interfaz para mock y API, consumidos con TanStack Query. Es el mismo patrón que la app: el día que exista la API sólo cambia el cuerpo de los repositorios, no las pantallas.
- **Modo demo**: si `VITE_API_URL` está vacío, se usan los mocks (igual que `ApiClient.isConfigured` en la app). Los cambios se guardan en `localStorage`, con un botón "Restablecer datos de demo".
- **Formularios**: React Hook Form con Zod, validando los formatos de la sección 7.1.
- **Mapas**: MapLibre GL (por ejemplo con `react-map-gl`) y **OpenFreeMap**, el mismo proveedor que usa la app: gratis y sin API key. Estilos listos: `https://tiles.openfreemap.org/styles/liberty` o `https://tiles.openfreemap.org/styles/positron`. La app no traza rutas por calles: une las paradas en orden con curvas suaves.
- **Gráficos**: Recharts o similar.
- **QR**: la librería `qrcode` (genera SVG o PNG en el navegador); impresión con CSS `@media print` o PDF.
- **Ordenar paradas**: dnd-kit.
- **Tests**: Vitest, sobre todo para el planificador, los formatos y las métricas.
- **Fechas**: `Intl` o date-fns con locale `es` y zona America/Managua.
- Un solo módulo de formatos (como `formatters.dart`) y una sola fuente de colores (los tokens de Tailwind).

Estructura de carpetas sugerida:

```text
src/
  app/            router, providers, layout (menú lateral y barra superior), guardas por rol
  core/           formatos (C$, fechas, horas), lector de horas y duraciones, planificador, QR
  data/
    models/       tipos de la sección 7
    mocks/        JSON copiados de la app, organizations.json y generador de eventos de visita
    repositories/ paradas, circuitos, eventos, cupones, analítica… (mock hoy, API mañana)
    api/          cliente HTTP con VITE_API_URL y token Bearer
  features/       auth, dashboard, stops, qr, circuits, group-sessions, events, coupons,
                  places, analytics, bookings, guides, settings
  components/     UI compartida: botones, campos, tarjetas, tablas, mapa, gráficos, estados vacíos
```

Mensajes de error iguales a los de la app: "Algo salió mal, intenta de nuevo", "No hay conexión a internet", "Sesión expirada, vuelve a iniciar sesión".

---

## 12. Identidad visual

Fuente de verdad en la app: `lib/src/core/theme/app_colors.dart`, `app_text_styles.dart` y `app_theme.dart`.

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

---

## 13. API (para cuando exista)

Lo que la app ya espera (`lib/src/data/datasources/remote/`):

- REST con JSON y `Authorization: Bearer <token>`.
- La respuesta puede venir plana o envuelta en `data` / `Data`.
- El usuario acepta `id`/`Id`, `email`/`Email`, `name`/`Nombre` y `token`/`Token`. Esto sugiere un backend con convenciones tipo .NET, aunque no está decidido.
- En uso: `GET /api/test-db-connection`, `POST /api/auth/login` (`{ email, password }`) y `POST /api/auth/register` (`{ name, email, password }`).
- Definidos pero sin usar todavía: `/api/status`, `/api/auth/forgot-password` y `/api/auth/me`.

(Propuesta) Endpoints que compartirían la app y el portal, con el mismo JSON de la sección 7:

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

---

## 14. Decisiones abiertas

Cada una trae un valor por defecto para no bloquear el trabajo.

1. **Qué hacen las startups.** Por defecto: operadores que publican circuitos privados del catálogo y ven sus reservas.
2. **Rol de admin K'Plan.** Por defecto: sí existe (aprueba organizaciones y paradas, maneja cupones de K'Plan y lugares destacados).
3. **Quién certifica a los guías y publica los horarios de grupo.** La app dice "guía certificado" pero no hay un flujo. Por defecto: en el MVP el portal sólo muestra los horarios; en la fase 2 la alcaldía o el admin certifican guías. El lado del guía (postularse, publicar horarios) queda fuera del portal, para una futura app de guías.
4. **Cupones de negocios y validación.** Por defecto: fase 2, con un código único por canje y una pantalla "Validar cupón".
5. **Horarios por día de la semana.** Por defecto: se mantiene el formato actual (un solo horario diario). Horarios por día requieren cambiar la app.
6. **Eventos de visita sin usuario ni reserva en el check-in.** Por defecto: la API agrega el usuario desde el token; proponer a la app que el check-in lleve `bookingId` y crear el evento "circuito completado".
7. **QR estático** (se puede fotografiar y escanear desde lejos). Por defecto: MVP con el formato actual `kplan:stop:<id>`; a futuro, un código rotativo o validar la ubicación.
8. **Backend.** Por defecto: esta tarea no lo construye; el portal queda con mocks y el contrato de la sección 13.
9. **Ciudad y alcaldía.** `city` agrupa paradas (Ometepe figura como "Rivas"). Por defecto: una alcaldía corresponde a una `city`.
10. **Imágenes.** Por defecto: campo de URL con vista previa; la subida de archivos llega con el backend.
11. **Reseñas.** Por defecto: sólo lectura, sin moderación.

---

## 15. Referencias en el código de la app

Rutas relativas a `c:\coding\kplan2\mobile\`. Son de sólo lectura para el agente del portal.

| Tema | Archivos |
|---|---|
| Modelos y parseo del JSON | `lib/src/data/models/*.dart` |
| Datos mock | `assets/mock/*.json` |
| Eventos de visita | `lib/src/data/models/visit_event.dart`, `lib/src/data/datasources/repository/visit_log_repository.dart`, `test/visit_log_repository_test.dart` |
| Dónde se registra cada evento | `lib/src/ui/booking/viewmodels/booking_viewmodel.dart`, `lib/src/ui/group_slots/viewmodels/group_slots_viewmodel.dart`, `lib/src/ui/stop_detail/viewmodels/stop_detail_viewmodel.dart`, `lib/src/ui/core/trip_actions.dart`, `lib/src/ui/my_circuit/viewmodels/my_circuit_viewmodel.dart`, `lib/src/ui/itinerary_assistant/viewmodels/itinerary_assistant_viewmodel.dart` |
| Planificador de itinerarios | `lib/src/core/utils/itinerary_planner.dart`, `test/itinerary_planner_test.dart` |
| Reglas del asistente | `lib/src/core/utils/itinerary_advisor.dart` |
| Horas, duraciones y formatos | `lib/src/core/utils/time_parser.dart`, `lib/src/core/utils/formatters.dart` |
| QR | `lib/src/core/utils/qr_codes.dart`, `lib/src/ui/stop_detail/view/qr_generator_view.dart` |
| Insignias y medallas | `lib/src/core/utils/medal_tiers.dart`, `lib/src/data/datasources/repository/badges_repository.dart` |
| Reserva y precios | `lib/src/ui/booking/viewmodels/booking_viewmodel.dart` |
| Guía o traductor | `lib/src/data/models/guide_request.dart`, `lib/src/data/datasources/repository/guide_request_repository.dart` |
| Horarios de grupo | `lib/src/data/models/circuit_group_session.dart`, `lib/src/data/datasources/repository/group_session_repository.dart` |
| Tema visual | `lib/src/core/theme/app_colors.dart`, `app_text_styles.dart`, `app_theme.dart` |
| API y sesión | `lib/src/data/datasources/remote/api_client.dart`, `api_routes.dart`, `lib/src/data/datasources/repository/auth_repository.dart` |
| Logos | `assets/images/logo/*.svg` |

---

## 16. Primeros pasos para el agente del portal

1. Leer este documento completo. Ante una duda del dominio, leer el código de la app (sección 15) sin modificar ese repositorio. Si algo de la app debería cambiar (por ejemplo, las insignias de Ometepe), anotarlo en lugar de tocarlo.
2. Copiar los JSON de `mobile/assets/mock/` y los logos de `mobile/assets/images/logo/` al portal. Reemplazar el favicon de Vite por el isologo y corregir el título de la página.
3. Configurar los tokens de la sección 12, la fuente Poppins y `lang="es"`.
4. Crear la capa de datos: tipos de la sección 7, repositorios con mocks y persistencia en `localStorage`, y `organizations.json`.
5. Login demo con las cuentas de la sección 10 y layout con menú lateral por rol.
6. Portar el lector de horas y duraciones, los formatos y el planificador de itinerarios, con tests que reproduzcan los valores de la sección 8.3.
7. Generador de eventos de visita de prueba (sección 9.4).
8. Construir los módulos en el orden de la fase 1 (sección 6).
