---
icon: lucide/list-checks
---

# Capacidades y restricciones

## Capacidades y restricciones

Confirmado por el usuario:

- **Perfil del negocio** = la ficha de su parada en la app (nombre, categoría, dirección, horario, tiempo sugerido, descripción, tip, fotos, coordenadas), más cuatro secciones nuevas: **novedades** (publicaciones cortas con foto), **qué ofrecemos** (productos o servicios con precio), **servicios del lugar** (tarjeta, parqueo, wifi, idiomas, accesibilidad) y **contacto y redes**. Las cuatro nuevas necesitan un cambio en la app para mostrarse.
- **Cupones**: todo negocio en K'Plan tiene que poder dar cupones. K'Plan cobra una **tarifa fija por cada cupón canjeado**; el monto lo configura el admin. El negocio ve sus canjes y lo que debe.
- **Llegadas esperadas**: a partir de los itinerarios, a qué hora y cuántas personas planean llegar, para que el lugar se prepare.
- **Eventos**: los negocios publican mini eventos; las alcaldías, talleres, charlas y ferias; el admin, eventos especiales de la app.
- **Insignias**: negocios y alcaldías compran (1) **activar la insignia** en un lugar que hoy no da, y (2) **campañas de insignias extra**: ×2, ×3 o ×5 por visita durante unas fechas, con el lugar destacado en la app.
- **Admin**: ver y administrar todas las organizaciones, administrar los cupones y publicar eventos especiales.
- **Verificación de guías y traductores**: envían cédula, récord de policía, carné de INTUR, certificados (primeros auxilios, idiomas) y, si ponen vehículo, licencia y seguro. Pasan tres etapas: revisión de documentos (cada uno contra su lista), antecedentes (Policía, INTUR, referencias) y decisión final. Se puede pedir corrección; todo queda en un historial con quién lo hizo. Nadie aparece como verificado en la app sin pasar las tres.
- **Postulación de organizaciones**: un negocio o una alcaldía nuevos se postulan desde el portal sin cuenta: datos de la organización (razón social y RUC para negocios), su lugar (uno que ya está en la app o uno nuevo como borrador), quién la representa y sus documentos. Negocios: constancia de RUC, matrícula municipal y cédula del representante (opcionales: licencia de turismo INTUR y permiso sanitario MINSA). Alcaldías: carta de designación y cédula. Al enviar se crea su cuenta: entra, ve en qué va la solicitud, corrige lo que le pidan y arma la ficha de su lugar; nada se publica en la app hasta que el equipo la aprueba (documentos con su lista y decisión). Al aprobarla se activa la organización, se publica su lugar y se le asignan los lugares que dijo administrar; al rechazarla, la cuenta queda suspendida y ve la nota al entrar.
- **Una sola puerta de entrada**: toda organización entra con una solicitud; no hay alta directa desde el admin. Si el negocio o la alcaldía no la llena solo, el equipo hace un **alta asistida**: llena la misma solicitud por ellos, con cobro opcional (la tarifa se configura en Tarifas y se cobra en el estado de cuenta del mes en que se aprueba). Pasa por la misma revisión, y quien la llenó no revisa sus documentos ni la decide. Al representante le llega una invitación para crear su contraseña.
- **Pedidos de lugares**: una organización ya aprobada pide desde "Mis lugares" uno que ya está en la app (con una nota de por qué es suyo) o uno nuevo, que se crea como borrador. El equipo lo aprueba o rechaza en Solicitudes > Lugares pedidos. Un lugar nuevo (en un pedido o en una solicitud) sólo se aprueba con al menos una foto y su propia ubicación en el mapa; la organización ve qué le falta. Si un pedido se rechaza, el borrador se borra. Un lugar pedido (en un pedido o en una solicitud abierta) queda apartado para quien lo pidió primero. El equipo también puede asignar o quitar lugares sin dueño desde el detalle de la organización; el formulario de edición ya no toca lugares ni estado.
- **Usuarios**: un panel con todas las cuentas del sistema (turistas, guías y traductores, negocios, alcaldías y equipo), para suspender, reactivar y ayudar a recuperar acceso.
- **Equipo interno y roles**: roles personalizables armados con permisos por módulo, con roles de base; el super admin no se edita y siempre queda al menos uno activo.
- **Circuitos**: el equipo administra todo el catálogo de la app (los privados, los creativos de las alcaldías y los **especiales de K'Plan**). Un especial da de 1 a 5 insignias extra de la categoría "Circuitos K'Plan" al completarlo; se elige si es privado (cada grupo agenda el suyo) o en grupo (horarios publicados por guías certificados, con cupo), y puede ser de temporada (desde y hasta). La duración, las insignias y su nota se calculan con el mismo planificador de la app; no se publica una hora de salida con avisos de horario. Un circuito con personas inscritas en horarios de grupo no se saca de la app, no se vuelve privado ni se borra. Los eventos especiales de K'Plan ya se publican desde Eventos.

Contrato con la app (no negociable):

- El portal escribe el mismo JSON que lee la app, campo por campo. Horas `h:mm a.m.`, duraciones `1 h 30 min`, fechas `YYYY-MM-DD`, ids en kebab-case ASCII.
- Categorías de lugar cerradas: Historia, Cultura, Gastronomía, Naturaleza, Aventura.
- Un solo horario diario por lugar, sin cruzar la medianoche.
- Las medallas de la app se calibraron para unas 11 insignias; las campañas de insignias extra obligan a recalibrarlas en la app.
- Pendiente en la app: leer los campos nuevos de `circuits.json` para los especiales (`isKplanCircuit`, `bonusBadges`, `bookingMode`, `availableFrom`, `availableUntil`), entregar las insignias extra de "Circuitos K'Plan", mostrar horarios de grupo en un especial (hoy `circuit_groups.json` sólo trae creativos) y ocultar un especial fuera de su temporada. La nota de insignias de un especial termina en `, más N insignias extra de "Circuitos K'Plan" al completarlo`. Hasta entonces el turista ve el especial todo el año como un circuito normal.

Decisiones por defecto, sin confirmar:

- Las startups y operadores turísticos entran como un tipo de negocio, no como un rol aparte.
- Los cupones son de negocios y de K'Plan; las alcaldías no dan cupones.
- Cada canje genera un código único que el negocio valida en el portal.
- Una organización nueva queda en revisión hasta que el admin la aprueba; una vez aprobada, su contenido se publica directo y el admin puede ocultarlo.
- En la postulación, un negocio puede decir que administra cualquier lugar de su ciudad que no tenga dueño (también lugares públicos); el equipo lo confirma al revisar. Pendiente decidir si los lugares públicos sólo los pueden reclamar las alcaldías.
- Los pagos son simulados en el modo demo.
- En el MVP los horarios de grupo sólo se ven en el portal; los publican los guías desde la app.
- Las listas de revisión de cada documento (por ejemplo "nivel B2 o más" en idiomas, "menos de 3 meses" en el récord) son una propuesta inicial para ajustar con el equipo.
- Una etapa que lleva más de 3 días se marca como atrasada.

## Evidencia disponible

- Datos de prueba de la app en `mobile/assets/mock/`: 34 paradas en 6 ciudades, 6 circuitos, 4 eventos, 5 cupones de K'Plan, 8 guías, 8 horarios de grupo y 5 lugares destacados. Las imágenes son de picsum.photos (placeholders).
- No existen todavía organizaciones reales, tarifas reales (tarifa por canje, precios de insignias), canjes, pagos ni eventos de visita reales. En el portal son datos de demo, se generan con semilla fija y no se presentan como cifras reales.
