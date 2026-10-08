---
icon: lucide/map-pin
---

# Eventos de visita

Es lo que la app junta para el portal (`lib/src/data/models/visit_event.dart` y `lib/src/data/datasources/repository/visit_log_repository.dart`). Hoy se guardan en memoria; el formato es el que recibiría el backend.

## Formato

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

| `reason`         | Texto que ve el turista    |
| ---------------- | --------------------------- |
| `closed`         | Estaba cerrado             |
| `too_far`        | Muy lejos o sin transporte |
| `no_time`        | Falta de tiempo            |
| `too_expensive`  | Muy caro                   |
| `not_interested` | No me interesó             |
| `weather`        | Por el clima               |
| `other`          | Otro motivo                |

| `stage`      | Cuándo pasa                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `planning`   | Al armar o ajustar su circuito: la quitó él, o aceptó la sugerencia del asistente de quitarla |
| `trip`       | Durante el viaje, con "Saltar"                                                                  |
| `trip_ended` | Al finalizar el viaje con la parada todavía pendiente (responder es opcional)                 |

## Métricas

- **Personas presentes** en una parada durante una franja (30 o 60 min): suma de `groupSize` de las visitas planeadas cuya estancia (`arrival` a `departure`) se cruza con la franja. Es lo que un restaurante necesita para preparar personal.
- **Llegadas esperadas** por franja: suma de `groupSize` de las visitas planeadas cuya `arrival` cae en la franja.
- **Llegadas reales**: cantidad de `check_in` de la parada. Si `groupSize` es null, contar 1 persona y marcarlo como "escaneo suelto".
- **Cumplimiento** por parada, circuito y día: `min(check-ins, visitas planeadas) / visitas planeadas`.
- **Abandonos**: conteo de `stop_dropped` por `reason` y por `stage`, por parada, circuito y período.

## Limitaciones

- Ningún evento lleva el usuario (la API lo tomaría del token) y el check-in no lleva `bookingId`, así que cruzar llegadas con visitas planeadas es aproximado.
- Si el turista deshace la eliminación de una parada, la app borra el evento: el envío a la API tendría que esperar o permitir borrarlo.
- Iniciar un viaje sin reserva genera check-ins sin visitas planeadas: puede haber más llegadas que visitas planeadas.
- No hay eventos de "circuito completado" ni de "cupón canjeado". (Propuesta) Agregarlos en la app para medir medallas de ciudad y canjes.
- `circuitId` puede ser un circuito propio de un turista (`user-circuit-…`) que no está en el catálogo: agruparlos como "Circuitos armados por turistas".
- En la app no se pueden cancelar reservas.

## Datos de prueba para la analítica

Como los eventos sólo existen en el teléfono, el portal necesita generarlos para que la analítica tenga qué mostrar:

- Semilla fija (generador pseudoaleatorio determinista) y fechas relativas a hoy, como `daysFromNow` en el mock de la app, para que siempre haya datos pasados y próximos. Rango sugerido: últimos 60 días y próximos 14.
- Reservas: por circuito privado y día, de 0 a 3 (más los fines de semana), grupos de 1 a 8 personas (más a menudo de 2 a 4) y hora de salida al azar entre sus `startTimes`. En los creativos, repartir los inscritos de los horarios de grupo.
- Por cada reserva, calcular el itinerario con el planificador portado y generar una `planned_visit` por parada.
- En las reservas pasadas, por cada parada: alrededor de 80 % de probabilidad de `check_in`, con `recordedAt` entre 0 y 30 minutos después de la llegada planeada. Si no hubo check-in, más o menos la mitad de las veces un `stop_dropped` (etapa `trip` o `trip_ended`) con razones repartidas así: `no_time` 30 %, `too_far` 20 %, `closed` 15 %, `weather` 10 %, `not_interested` 10 %, `too_expensive` 5 %, `other` 10 %.
- Además: `stop_dropped` en etapa `planning` sobre circuitos `user-circuit-…`, y `check_in` sueltos (`circuitId: null`) en las paradas más populares.
- Dejar algún caso visible para la demo, por ejemplo una parada con muchas razones "Estaba cerrado" porque cierra temprano.
