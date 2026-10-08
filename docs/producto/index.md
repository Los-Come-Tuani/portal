---
icon: lucide/compass
---

# Producto

## Plataforma

web

## Usuarios

- **Negocios** (restaurante, museo, finca cafetalera, tabacalera, mercado, operador turístico, hotel): el dueño o encargado, en una computadora de la oficina. Mantiene al día el perfil de su lugar tal como lo ve el turista, atrae visitas con cupones y campañas de insignias, y se prepara para los grupos que los itinerarios de la app ya anuncian.
- **Alcaldías** (León, Masaya, Estelí…): el equipo de turismo municipal. Hace lo mismo que un negocio sobre los lugares públicos de su ciudad (catedral, parque, murales) y publica eventos propios: talleres, charlas, ferias.
- **Equipo K'Plan**: los empleados internos. Cada uno tiene un **rol** que decide qué ve y qué hace (verificar guías, admitir organizaciones, moderar contenido, cobros, soporte…). El **super admin** tiene todo, incluido armar los roles e invitar al equipo.
- Turistas y guías **no** usan el portal: para ellos está la app móvil. Los guías y traductores envían sus documentos desde la app; el equipo los verifica en el portal.

## Propósito del producto

K'Plan es una app móvil de turismo en Nicaragua. En la app, cada negocio o lugar público es una **parada**: el turista la ve, la agenda en su itinerario y confirma su visita escaneando el QR del lugar, que le da insignias. El portal es el lado de las organizaciones: mantener ese perfil, publicar eventos, dar cupones, comprar insignias y ver a qué hora llegan los turistas.

Éxito: perfiles completos y correctos (un horario o unas coordenadas mal cargadas le quitan visitas al negocio en la app), organizaciones que reciben turistas gracias a K'Plan, y un cobro claro por lo que K'Plan les genera.

## Posicionamiento

K'Plan sabe a qué hora llega cada grupo, porque el turista arma su itinerario en la app antes de salir. Un directorio turístico no puede decirle a un restaurante "mañana a las 12:10 p.m. llegan 4 personas del circuito Granada Histórica". Las insignias (se ganan al escanear el QR del lugar) y los cupones (se pagan con insignias) convierten ese flujo en visitas y ventas que se pueden medir y cobrar.

## Contexto operativo

- Se usa sobre todo en computadora, en la oficina (confirmado). Tiene que funcionar en celular, pero el escritorio manda.
- Español, dinero en córdobas (`C$ 250`, sin decimales), horas de America/Managua (UTC−6) con el formato de la app (`8:30 a.m.`).
- El QR de cada lugar lleva el texto exacto `kplan:stop:<id>` y se imprime como cartel para el local.
- Todavía no hay backend. El portal arranca con datos JSON de prueba y persistencia local, detrás de una capa de datos con los endpoints ya definidos: el día que exista la API se conecta sin tocar pantallas.
- Contexto completo de la app y del contrato de datos: [Contexto K'Plan](../contexto/index.md).
