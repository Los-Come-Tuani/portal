# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Negocios** (restaurante, museo, finca cafetalera, tabacalera, mercado, operador turístico, hotel): el dueño o encargado, en una computadora de la oficina. Mantiene al día el perfil de su lugar tal como lo ve el turista, atrae visitas con cupones y campañas de insignias, y se prepara para los grupos que los itinerarios de la app ya anuncian.
- **Alcaldías** (León, Masaya, Estelí…): el equipo de turismo municipal. Hace lo mismo que un negocio sobre los lugares públicos de su ciudad (catedral, parque, murales) y publica eventos propios: talleres, charlas, ferias.
- **Equipo K'Plan**: los empleados internos. Cada uno tiene un **rol** que decide qué ve y qué hace (verificar guías, admitir organizaciones, moderar contenido, cobros, soporte…). El **super admin** tiene todo, incluido armar los roles e invitar al equipo.
- Turistas y guías **no** usan el portal: para ellos está la app móvil. Los guías y traductores envían sus documentos desde la app; el equipo los verifica en el portal.

## Product Purpose

K'Plan es una app móvil de turismo en Nicaragua. En la app, cada negocio o lugar público es una **parada**: el turista la ve, la agenda en su itinerario y confirma su visita escaneando el QR del lugar, que le da insignias. El portal es el lado de las organizaciones: mantener ese perfil, publicar eventos, dar cupones, comprar insignias y ver a qué hora llegan los turistas.

Éxito: perfiles completos y correctos (un horario o unas coordenadas mal cargadas le quitan visitas al negocio en la app), organizaciones que reciben turistas gracias a K'Plan, y un cobro claro por lo que K'Plan les genera.

## Positioning

K'Plan sabe a qué hora llega cada grupo, porque el turista arma su itinerario en la app antes de salir. Un directorio turístico no puede decirle a un restaurante "mañana a las 12:10 p.m. llegan 4 personas del circuito Granada Histórica". Las insignias (se ganan al escanear el QR del lugar) y los cupones (se pagan con insignias) convierten ese flujo en visitas y ventas que se pueden medir y cobrar.

## Operating Context

- Se usa sobre todo en computadora, en la oficina (confirmado). Tiene que funcionar en celular, pero el escritorio manda.
- Español, dinero en córdobas (`C$ 250`, sin decimales), horas de America/Managua (UTC−6) con el formato de la app (`8:30 a.m.`).
- El QR de cada lugar lleva el texto exacto `kplan:stop:<id>` y se imprime como cartel para el local.
- Todavía no hay backend. El portal arranca con datos JSON de prueba y persistencia local, detrás de una capa de datos con los endpoints ya definidos: el día que exista la API se conecta sin tocar pantallas.
- Contexto completo de la app y del contrato de datos: `docs/CONTEXTO_KPLAN.md`.

## Capabilities and Constraints

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
- **Pedidos de lugares**: una organización ya aprobada pide desde "Mis lugares" uno que ya está en la app (con una nota de por qué es suyo) o uno nuevo, que se crea como borrador. El equipo lo aprueba o rechaza en Solicitudes > Lugares pedidos. Un lugar nuevo sólo se aprueba con al menos una foto y su propia ubicación en el mapa; si se rechaza, el borrador se borra. Un lugar pedido (en un pedido o en una solicitud abierta) queda apartado para quien lo pidió primero. El equipo también puede asignar o quitar lugares sin dueño desde el detalle de la organización; el formulario de edición ya no toca lugares ni estado.
- **Usuarios**: un panel con todas las cuentas del sistema (turistas, guías y traductores, negocios, alcaldías y equipo), para suspender, reactivar y ayudar a recuperar acceso.
- **Equipo interno y roles**: roles personalizables armados con permisos por módulo, con roles de base; el super admin no se edita y siempre queda al menos uno activo.

Contrato con la app (no negociable):

- El portal escribe el mismo JSON que lee la app, campo por campo. Horas `h:mm a.m.`, duraciones `1 h 30 min`, fechas `YYYY-MM-DD`, ids en kebab-case ASCII.
- Categorías de lugar cerradas: Historia, Cultura, Gastronomía, Naturaleza, Aventura.
- Un solo horario diario por lugar, sin cruzar la medianoche.
- Las medallas de la app se calibraron para unas 11 insignias; las campañas de insignias extra obligan a recalibrarlas en la app.

Decisiones por defecto, sin confirmar:

- Las startups y operadores turísticos entran como un tipo de negocio, no como un rol aparte.
- Los cupones son de negocios y de K'Plan; las alcaldías no dan cupones.
- Cada canje genera un código único que el negocio valida en el portal.
- Una organización nueva queda en revisión hasta que el admin la aprueba; una vez aprobada, su contenido se publica directo y el admin puede ocultarlo.
- En la postulación, un negocio puede decir que administra cualquier lugar de su ciudad que no tenga dueño (también lugares públicos); el equipo lo confirma al revisar. Pendiente decidir si los lugares públicos sólo los pueden reclamar las alcaldías.
- Los pagos son simulados en el modo demo.
- Circuitos, circuitos creativos y horarios de grupo quedan para una fase siguiente.
- Las listas de revisión de cada documento (por ejemplo "nivel B2 o más" en idiomas, "menos de 3 meses" en el récord) son una propuesta inicial para ajustar con el equipo.
- Una etapa que lleva más de 3 días se marca como atrasada.

## Brand Commitments

- El nombre se escribe **K'Plan**, con apóstrofo.
- Los colores y la tipografía de la app móvil son obligatorios: la fuente de verdad es `mobile/lib/src/core/theme/app_colors.dart`, `app_text_styles.dart` y `app_theme.dart`. Poppins en toda la interfaz, esquinas de 10 px.
- En el portal cada color vive en un solo lugar: cambiarlo no puede requerir tocar más de una línea.
- Logos en `mobile/assets/images/logo/`: isologo, logotipo e imagotipo, versión "Claro" para fondos claros.
- Tono cercano y claro; la app tutea.

## Evidence on Hand

- Datos de prueba de la app en `mobile/assets/mock/`: 34 paradas en 6 ciudades, 6 circuitos, 4 eventos, 5 cupones de K'Plan, 8 guías, 8 horarios de grupo y 5 lugares destacados. Las imágenes son de picsum.photos (placeholders).
- No existen todavía organizaciones reales, tarifas reales (tarifa por canje, precios de insignias), canjes, pagos ni eventos de visita reales. En el portal son datos de demo, se generan con semilla fija y no se presentan como cifras reales.

## Product Principles

1. **El perfil es la parada.** Lo que la organización edita es exactamente lo que el turista ve y lo que usa el itinerario; siempre se muestra cómo queda en la app.
2. **Primero el turista que viene.** Saber quién llega y a qué hora es la razón para abrir el portal cada día.
3. **Cobrar sólo lo que K'Plan genera, y explicarlo.** Cada cobro (canjes, insignias) va junto al dato que lo produjo.
4. **Las pantallas no saben de dónde vienen los datos.** Pantallas, hooks, repositorios, y detrás mocks o API.
5. **Una sola fuente para cada decisión**: colores, formatos, endpoints y tarifas.
