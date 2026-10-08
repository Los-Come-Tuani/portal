---
icon: lucide/info
---

# Contexto K'Plan

Este documento es para el agente que construye el portal. Explica la app móvil que ya existe, el formato de datos que comparten y lo que el portal tiene que manejar. Se armó leyendo el código de la app (último commit `75ad5fa`, 25 sep 2026).

> Lo marcado como **(propuesta)** no existe en la app: es una recomendación para el portal y se puede cambiar. Todo lo demás sale del código. Las decisiones que conviene confirmar con el equipo están en [Decisiones abiertas](decisiones-abiertas.md).

## Resumen

- **K'Plan** es una app móvil (Flutter) de turismo en **Nicaragua**. El turista descubre circuitos, paradas y eventos, arma sus propios circuitos, agenda, contrata guía o traductor y recorre con un itinerario que calcula a qué hora llega a cada lugar. En cada parada escanea un **código QR** y gana **insignias**, que suben **medallas** y se canjean por **cupones**.
- El **portal web** es para las organizaciones: **alcaldías, negocios y startups** (así lo define `portal/README.md`). Sirve para dos cosas:
  1. **Crear y mantener el contenido que ve el turista**: paradas, circuitos, circuitos creativos oficiales, eventos, cupones y los códigos QR que se imprimen en cada lugar.
  2. **Ver lo que hacen los turistas**: cuántas personas llegarán a cada lugar y a qué hora, quién llegó de verdad (escaneó el QR) y quién no llegó y por qué.
- **No hay backend todavía.** La app funciona con JSON de prueba y estado en memoria. El portal debe arrancar igual: una capa de datos con esos mismos JSON, lista para cambiarse por una API.
- El portal **escribe lo que la app lee**, así que ambos usan el mismo formato JSON, campo por campo. Algunos formatos son delicados (horas como `"8:30 a.m."`, duraciones como `"1 h 30 min"`, coordenadas en `location` o en `coordinates` según la entidad): ver [Contrato de datos](contrato-datos.md).
- El proyecto del portal ya está creado, vacío: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Oxlint. Interfaz en **español**, dinero en **córdobas** (`C$ 250`), horas de **America/Managua** (UTC−6, sin horario de verano). La marca se escribe **K'Plan**, con apóstrofo.

## Quién usa el portal

La app no tiene el concepto de "dueño" de una parada o de un circuito: el portal lo agrega.

| Rol                                   | Ejemplos                                                                        | Alcance            | Qué maneja                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alcaldía                              | Alcaldía de León, de Masaya, de Estelí (aparecen como `organizer` en los datos) | Su ciudad (`city`) | Paradas públicas de su ciudad, **circuitos creativos**, eventos de su ciudad, horarios de grupo de sus circuitos creativos y la analítica de toda la ciudad |
| Negocio                               | Restaurante, museo, tabacalera, finca cafetalera, mercado                       | Sus paradas        | La ficha de su lugar (sobre todo el **horario**), su QR, la analítica de su lugar y (propuesta) cupones propios                                             |
| Startup (propuesta de interpretación) | Operador turístico o emprendimiento                                             | Sus circuitos      | Circuitos privados del catálogo (con precio por persona), sus reservas y su analítica                                                                       |
| Admin K'Plan (propuesta)              | Equipo de K'Plan                                                                | Todo               | Aprobar organizaciones y paradas nuevas, cupones de K'Plan, lugares destacados y analítica global                                                           |

Cómo encaja con los datos actuales:

- Los 3 circuitos creativos (`leon-colonial`, `masaya-artesanias-volcan`, `esteli-murales-tabaco`) tienen `organizer: "Alcaldía de …"`.
- Los otros 3 (`granada-historias-sabores`, `isla-de-ometepe`, `ruta-del-cafe`) no dicen quién los creó: son candidatos a pertenecer a una startup (o a K'Plan).
- Varias paradas son negocios: `esteli-tabacalera` (tabacalera artesanal), `cafe-beneficio`, `cafe-secado`, `cafe-tueste` y `cafe-cata` (una finca cafetalera), `cafe-selva-negra` (Finca Selva Negra), `leon-mercado` (Mercado La Terminal), `masaya-mercado-artesanias`.
- (Propuesta) Una alcaldía edita las paradas de su ciudad que no pertenecen a un negocio, y ve la analítica de todas las paradas de su ciudad.

## Glosario

| Término                                  | Qué es                                                                                                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parada (`Stop`)                          | Un lugar concreto que se visita: catedral, mercado, mirador, restaurante. Vive aparte de los circuitos porque una misma parada puede estar en varios.                                                      |
| Circuito (`Circuit`)                     | Recorrido ordenado de paradas **de una misma ciudad**, con horas de salida, precio por adulto y por niño, punto de encuentro, qué incluye, etc. Es privado: cada grupo agenda el suyo.                     |
| Circuito creativo                        | Circuito oficial creado por una alcaldía (`isCreativeCircuit: true`). Sus paradas no se cambian y se hace en grupo, inscribiéndose en un horario de grupo. Da 3 insignias extra y la medalla de la ciudad. |
| Horario de grupo (`CircuitGroupSession`) | Fecha y hora en que un guía certificado hace un circuito creativo, con cupo (`capacity`), inscritos (`joinedCount`), si incluye transporte y una nota del guía.                                            |
| Circuito propio                          | Circuito armado por el turista (en la app, `CircuitCollection` con `isUserCreated`). No tiene precio por persona: sólo paga al guía si contrata uno. Su id empieza con `user-circuit-`.                    |
| Itinerario                               | La hora de llegada y de salida en cada parada, calculada con la hora de salida, el tiempo sugerido de cada parada, los traslados, el ritmo y el transporte.                                                |
| Ritmo                                    | Relajado, equilibrado o intenso: cambia el tiempo en cada parada y cuánto puede durar el día.                                                                                                              |
| Insignia                                 | Se gana al escanear el QR de una parada con `hasBadge: true`, en la categoría de esa parada. Una vez por parada.                                                                                           |
| Medalla                                  | Nivel (bronce, plata, oro) según las insignias acumuladas, por categoría y general.                                                                                                                        |
| Medalla de ciudad                        | Se gana al completar un circuito creativo de esa ciudad (QR en todas sus paradas).                                                                                                                         |
| Cupón                                    | Beneficio que se canjea con insignias del saldo.                                                                                                                                                           |
| Propuesta de trabajo (`GuideRequest`)    | Lo que publica el turista al agendar si quiere guía y/o traductor. Los guías se postulan (`GuideApplication`) y él elige a quién contratar.                                                                |
| Evento de visita (`VisitEvent`)          | Lo que la app registra para el portal: visita planeada, check-in con QR o parada dejada con su razón.                                                                                                      |
| Evento (`EventItem`)                     | Actividad con fecha en una ciudad: fiestas, ferias, festivales.                                                                                                                                            |
| Lugar destacado (`Place`)                | Tarjeta simple del home: nombre, ubicación e imagen.                                                                                                                                                       |
