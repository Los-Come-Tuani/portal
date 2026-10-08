---
icon: lucide/smartphone
---

# La app móvil

## Qué hace el turista

| Función                       | Qué es                                                                                                                                                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descubrir                     | Home con pestañas (Para ti, circuitos, paradas filtrables por categoría), lugares destacados y eventos próximos, con buscador.                                                                                                                                          |
| Detalle de circuito           | Galería, descripción, paradas en orden, itinerario con la hora de llegada a cada parada según la hora de salida elegida, mapa, reseñas, punto de encuentro, qué incluye, recomendaciones e insignias que contiene.                                                      |
| Mis circuitos                 | Funcionan como playlists: el turista añade paradas a circuitos o crea los suyos, y elige hora de salida, transporte (a pie o en vehículo) y ritmo (relajado, equilibrado o intenso). Al quitar una parada se le pregunta por qué.                                       |
| Asistente de itinerarios      | "IA" simulada con reglas fijas. Pregunta ciudad, ritmo, transporte, hora e intereses, arma el día y sugiere cambios: ir en vehículo, reordenar, salir más tarde, quitar una parada cerrada o que no cabe, **almorzar en un lugar de Gastronomía** o agregar una parada. |
| Agendar                       | Para circuitos privados (del catálogo o propios): fecha, hora de salida, adultos y niños; precio por persona más 20 % de servicio. Opcionalmente publica una propuesta de trabajo para guía y/o traductor.                                                              |
| Guía o traductor              | Los guías se postulan a la propuesta (simulado), el turista compara perfiles, contrata y chatea (simulado).                                                                                                                                                             |
| Circuitos creativos           | Circuitos oficiales de una alcaldía. No se agendan en privado: el turista se inscribe con su grupo en un **horario de grupo** publicado por un guía certificado, con cupo limitado. Completarlo da 3 insignias extra y la medalla de esa ciudad.                        |
| Viaje en curso                | Sigue el itinerario: siguiente parada, hora estimada de llegada y atraso. Cada parada se confirma escaneando su QR. Se pueden saltar paradas (con razón) y, al finalizar, se pregunta por las pendientes.                                                               |
| Insignias, medallas y cupones | Escanear el QR de una parada con insignia da una insignia de su categoría (una vez por parada). Las insignias acumuladas suben medallas (bronce, plata, oro) y el saldo se gasta en cupones.                                                                            |

## Estado técnico

- Flutter con MVVM y repositorios, Provider, go_router y dio.
- `ApiClient.baseUrl` está vacío, así que todo corre en **modo demo**: el login acepta cualquier correo, el catálogo sale de `assets/mock/*.json`, y las reservas, circuitos propios, insignias y eventos de visita viven en memoria (se pierden al cerrar la app).
- Está simulado: el login, las postulaciones de guías, el chat con el guía y el asistente de itinerarios.
- **No existe una app para guías.** Las postulaciones y los horarios de grupo salen de datos fijos.
