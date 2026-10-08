---
icon: lucide/database
---

# Contrato de datos

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

## Formatos que la app parsea

Si un valor no cumple el formato, la app no falla: lo ignora en silencio. Por eso el portal tiene que validarlos.

| Dato                                                     | Formato                               | Ejemplos                                         | Si viene mal                                                                                                     |
| -------------------------------------------------------- | -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Horas (`opensAt`, `closesAt`, `startTimes`, `startTime`) | `h:mm a.m.` o `h:mm p.m.`             | `"8:30 a.m."`, `"12:00 p.m."`, `"3:00 p.m."`     | El horario de la parada se descarta y se trata como si nunca cerrara; una hora de salida se toma como medianoche |
| Duración de una parada (`duration`)                      | `N min`, `N h` o `N h M min`          | `"30 min"`, `"1 h 30 min"`                       | Se usan 30 minutos                                                                                               |
| Fecha de un evento (`date`)                              | `YYYY-MM-DD`                          | `"2026-12-07"`                                   | Se usa la fecha de hoy                                                                                           |
| Coordenadas                                              | `{ "latitude": …, "longitude": … }`   | `{ "latitude": 11.9299, "longitude": -85.9561 }` | Quedan en 0,0                                                                                                    |
| IDs                                                      | slug en minúsculas, kebab-case, ASCII | `granada-catedral`                               | Evitar tildes: el mock tiene `gritería-2026`                                                                     |

- La app lee las horas con la expresión `^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$` sobre el texto en minúsculas. El portal debe escribir siempre la forma canónica: `8:30 a.m.`.
- `opensAt` y `closesAt` van juntos o no van. `closesAt` debe ser posterior a `opensAt`: el modelo no soporta cerrar pasada la medianoche, ni horarios distintos por día de la semana.
- Las coordenadas se llaman `coordinates` en paradas y eventos, y `location` en circuitos (ahí son el punto de encuentro). En eventos, `location` es un texto.

## Formatos de presentación

Mismos textos que la app (`lib/src/core/utils/formatters.dart`), para que el portal y la app se lean igual:

| Qué       | Formato                                                                  |
| --------- | -------------------------------------------------------------------------- |
| Dinero    | `C$ 250` (sin decimales)                                                 |
| Hora      | `8:30 a.m.`, `2:05 p.m.`                                                 |
| Franja    | `8:30 – 9:00 a.m.`; si cruza el mediodía, `11:40 a.m. – 12:10 p.m.`      |
| Duración  | `4 h 20 min`, `45 min`, `3 h`                                            |
| Fecha     | `Sábado 26 sep`, `16 nov 2026`, `16 nov` (meses abreviados en minúscula) |
| Distancia | `800 m`, `2.2 km`                                                        |
| Personas  | `1 persona`, `4 personas`                                                |
