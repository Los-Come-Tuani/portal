---
icon: lucide/scale
---

# Reglas de negocio

## Categorías y listas

- Categorías de parada, lista cerrada: **Historia, Cultura, Gastronomía, Naturaleza, Aventura**. La app tiene íconos, filtros y medallas por categoría: agregar una nueva requiere cambiar la app.
- Categorías de insignia: esas 5 más **Circuitos creativos**.
- Categorías de circuito en los datos: Ciudad y Naturaleza. Colores de sus etiquetas en la app: Ciudad `#2B8FD1`, Naturaleza `#0E9AA7`, Cultura `#7B5EA7`; cualquier otra usa el terracota de la marca.
- Dificultad en los datos: Fácil y Moderado.
- Ciudades en los datos: Granada, Rivas (las paradas de Ometepe), León, Matagalpa, Masaya y Estelí. `city` decide qué paradas se combinan en un circuito y de qué ciudad es cada medalla.

## Campos calculados del circuito

- `badges`: número de paradas del circuito con `hasBadge: true`. Hoy `isla-de-ometepe` dice 4, pero sólo 3 de sus paradas tienen insignia: por eso conviene calcularlo.
- `badgesNote`: `Este recorrido contiene un total de {badges} insignias coleccionables`. En los creativos se agrega `, más 3 insignias extra de "Circuitos creativos" y una medalla de {city} al completarlo`.
- `duration`: duración total del itinerario con ritmo equilibrado y el `travelMode` del circuito, formateada (`4 h 20 min`). No depende de la hora de salida.
- `durationShort` (regla deducida de los datos): `1 día` si dura 8 h o más; si no, las horas redondeadas más ` aprox.` (4 h 20 min da `4 h aprox.`; 6 h 45 min da `7 h aprox.`).
- Todas las paradas deben tener la misma `city` que el circuito.

## Planificador de itinerarios (portar a TypeScript tal cual)

Fuente: `mobile/lib/src/core/utils/itinerary_planner.dart`. No usa un servicio de rutas: estima cada traslado con la distancia en línea recta.

- Distancia: fórmula del haversine (radio 6371 km) multiplicada por 1.3, porque las calles no van en línea recta.
- Traslado entre dos paradas (los umbrales se comparan con la distancia ya multiplicada por 1.3):
  - Menos de 0.15 km: "A pasos", 0 minutos.
  - A pie, o hasta 1 km aunque el circuito sea en vehículo: a 4.5 km/h.
  - En vehículo: a 30 km/h, más 5 minutos por subir, bajar y estacionar.
  - Los minutos se redondean hacia arriba a múltiplos de 5, con un mínimo de 5.
  - `legMinutes` fija el traslado a mano, tal cual y sin redondear; con 0 se muestra "Sin traslado".
- Tiempo en cada parada: la `duration` de la parada (30 min si no se entiende) por el factor del ritmo, redondeado a múltiplos de 5 (mínimo 5), más la holgura.

| Ritmo       | Factor | Holgura por parada | Día máximo |
| ----------- | ------ | ------------------- | ---------- |
| Relajado    | 1.25   | 10 min              | 6 h        |
| Equilibrado | 1      | 0                   | 8 h        |
| Intenso     | 0.85   | 0                   | 10 h       |

- Avisos: un tramo a pie de más de 2 km; llegar cuando ya cerró, salir después del cierre o llegar antes de que abra; terminar el día después de las 6:30 p.m.
- Valores de referencia del test de la app (`mobile/test/itinerary_planner_test.dart`), que el port debe reproducir:
  - `granada-historias-sabores` saliendo a las 8:30 a.m.: `8:30 – 9:00 a.m.`, `9:00 – 9:25 a.m.` ("A pasos"), `9:35 – 10:15 a.m.` ("10 min a pie"), `10:25 – 11:00 a.m.`, `11:10 – 11:40 a.m.` y `12:10 – 12:50 p.m.`. Total 4 h 20 min, con un solo aviso: tramo largo (2.2 km a pie) hacia `granada-muelle`.
  - `isla-de-ometepe` saliendo a las 6:00 a.m.: Moyogalpa `7:00 – 7:30 a.m.` ("Sin traslado"); termina a las 3:50 p.m., sin avisos.
  - `leon-colonial` saliendo a las 7:00 a.m.: aviso de que `leon-catedral` abre a las 8:00 a.m.
  - Tiempo en `granada-catedral` (30 min): equilibrado 30, relajado 50, intenso 25.
  - La `duration` publicada de cada circuito coincide con el cálculo para todas sus `startTimes`, sin avisos de horario.

## Reservas y precios

- Circuitos privados del catálogo: precio por adulto y por niño; al subtotal se le suma un **20 % de servicio**. Se agenda con al menos 1 día de anticipación y hasta 365 días, con 0 a 20 adultos y 0 a 20 niños.
- Circuitos propios: sin precio por persona; horas de salida de 7:00 a.m. a 3:00 p.m., cada hora.
- Circuitos creativos: no se agendan en privado. El grupo se inscribe en un horario si cabe en los lugares libres (`capacity - joinedCount`); paga el precio por persona más el 20 %.

## Guía o traductor (referencia; el portal no lo gestiona en el MVP)

- Tarifas por hora: guía local C$ 140, guía bilingüe C$ 200, traductor C$ 90. Se suma un 15 % si el guía pone el vehículo y se resta un 10 % si el servicio dura más de 24 h y el turista le da alojamiento. Mínimo 5 h con guía y 3 h sólo con traductor.
- La propuesta queda abierta 24 h y recibe hasta 3 postulaciones por puesto.

## Insignias, medallas y cupones

- Una insignia por parada con `hasBadge`, una sola vez por turista, en la categoría de la parada.
- Medallas por categoría: bronce con 1 insignia, plata con 2 y oro con 3. Generales: bronce con 3, plata con 6 y oro con 10. Se calibraron para un catálogo de unas 11 insignias (hoy hay 15 paradas con insignia); si el portal agrega muchas más, habrá que recalibrarlas en la app.
- Completar un circuito creativo (QR en todas sus paradas) da 3 insignias de "Circuitos creativos" y la medalla de esa ciudad (una por ciudad).
- Los cupones se pagan con el saldo (insignias ganadas menos gastadas); cada cupón se canjea una vez por turista. Gastar insignias no baja las medallas.

## Por qué a un negocio le importa su ficha

- La app avisa si el turista llegaría con el lugar cerrado, y el asistente propone quitarlo (razón "Estaba cerrado") o salir más tarde. Un horario mal cargado le quita visitas al negocio.
- Si el día del turista pasa por el mediodía (12:00 a 2:00 p.m.) y no tiene parada de **Gastronomía**, el asistente propone almorzar en la parada de Gastronomía de esa ciudad que menos traslado agregue. Los restaurantes tienen que estar como Gastronomía, con horario y coordenadas correctas.
- Al armar un día desde cero, el asistente prioriza las paradas que coinciden con los intereses del turista, las mejor calificadas y las que dan insignia.
