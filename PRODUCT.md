# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Negocios** (restaurante, museo, finca cafetalera, tabacalera, mercado, operador turístico, hotel): el dueño o encargado, en una computadora de la oficina. Mantiene al día el perfil de su lugar tal como lo ve el turista, atrae visitas con cupones y campañas de insignias, y se prepara para los grupos que los itinerarios de la app ya anuncian.
- **Alcaldías** (León, Masaya, Estelí…): el equipo de turismo municipal. Hace lo mismo que un negocio sobre los lugares públicos de su ciudad (catedral, parque, murales) y publica eventos propios: talleres, charlas, ferias.
- **Admin K'Plan**: el equipo de K'Plan. Ve y administra todas las organizaciones, los cupones, las campañas de insignias y los cobros, y publica eventos especiales de la app.
- Turistas y guías **no** usan el portal: para ellos está la app móvil.

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

Contrato con la app (no negociable):

- El portal escribe el mismo JSON que lee la app, campo por campo. Horas `h:mm a.m.`, duraciones `1 h 30 min`, fechas `YYYY-MM-DD`, ids en kebab-case ASCII.
- Categorías de lugar cerradas: Historia, Cultura, Gastronomía, Naturaleza, Aventura.
- Un solo horario diario por lugar, sin cruzar la medianoche.
- Las medallas de la app se calibraron para unas 11 insignias; las campañas de insignias extra obligan a recalibrarlas en la app.

Decisiones por defecto, sin confirmar:

- Las startups y operadores turísticos entran como un tipo de negocio, no como un rol aparte.
- Los cupones son de negocios y de K'Plan; las alcaldías no dan cupones.
- Cada canje genera un código único que el negocio valida en el portal.
- Una organización nueva queda en revisión hasta que el admin la aprueba; su contenido se publica directo y el admin puede ocultarlo.
- Los pagos son simulados en el modo demo.
- Circuitos, circuitos creativos y horarios de grupo quedan para una fase siguiente.

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
