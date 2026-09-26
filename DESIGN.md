---
name: Portal K'Plan
description: El lado de las organizaciones de la app K'Plan, ordenado en el tiempo y vestido con el mundo de la app.
colors:
  canvas: "#f8f4e6"
  paper: "#f1e8d2"
  paper-deep: "#ebdfc4"
  surface: "#ffffff"
  field: "#fdfbf3"
  placeholder: "#ede7d6"
  ink: "#1e2022"
  muted: "#5c5c5c"
  hint: "#626058"
  outline: "#cfc7b4"
  divider: "#e6e0d0"
  brand: "#d95d39"
  brand-strong: "#ad5137"
  on-brand: "#ffffff"
  white: "#ffffff"
  planned: "#2f6690"
  confirmed: "#2d6a4f"
  badge: "#e0b84c"
  badge-deep: "#6e603a"
  medal-none: "#c7c0b0"
  star: "#f5a623"
  danger: "#b3261e"
  chip-city: "#2b8fd1"
  chip-nature: "#0e9aa7"
  chip-culture: "#7b5ea7"
  map-land: "#f1e8d2"
  map-water: "#a7c4d2"
  map-park: "#cedbb8"
typography:
  display:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: "2.75rem"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "2.125rem"
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  title:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  lead:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  body:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  small:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  caption:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.125rem"
  caption-strong:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1.125rem"
  label:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1.125rem"
    letterSpacing: "0.06em"
  button:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: "1.25rem"
    letterSpacing: "0.06em"
  figure:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: "1.25rem"
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "6px"
  kp: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  unit: "4px"
  control-gap: "8px"
  item-gap: "12px"
  panel: "20px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    typography: "{typography.button}"
    rounded: "{rounded.kp}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
    textColor: "{colors.on-brand}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.kp}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.kp}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.kp}"
    padding: "0 16px"
    height: "40px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.kp}"
    padding: "0 12px"
    height: "32px"
  button-sm:
    padding: "0 12px"
    height: "32px"
  button-lg:
    padding: "0 24px"
    height: "48px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.kp}"
    padding: "0 12px"
    height: "40px"
  tag-neutral:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tag-planned:
    backgroundColor: "rgba(47, 102, 144, 0.10)"
    textColor: "{colors.planned}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tag-confirmed:
    backgroundColor: "rgba(45, 106, 79, 0.10)"
    textColor: "{colors.confirmed}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tag-badge:
    backgroundColor: "{colors.badge}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tag-brand:
    backgroundColor: "rgba(217, 93, 57, 0.12)"
    textColor: "{colors.brand-strong}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tag-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tag-danger:
    backgroundColor: "rgba(179, 38, 30, 0.10)"
    textColor: "{colors.danger}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.kp}"
    padding: "20px"
  sidebar-expanded:
    backgroundColor: "{colors.paper}"
    width: "16.5rem"
  sidebar-collapsed:
    backgroundColor: "{colors.paper}"
    width: "4.5rem"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.kp}"
    padding: "0 12px 0 15px"
    height: "40px"
  nav-item-hover:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink}"
  nav-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
  nav-subitem:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.kp}"
    padding: "0 12px"
    height: "36px"
  nav-count:
    backgroundColor: "rgba(47, 102, 144, 0.12)"
    textColor: "{colors.planned}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
  nav-count-active:
    backgroundColor: "rgba(248, 244, 230, 0.15)"
    textColor: "{colors.canvas}"
  nav-count-dot:
    backgroundColor: "{colors.planned}"
    rounded: "{rounded.full}"
    size: "8px"
  nav-tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  nav-flyout:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.kp}"
    padding: "6px"
    width: "13rem"
  segmented-option:
    textColor: "{colors.muted}"
    typography: "{typography.small}"
    rounded: "8px"
    padding: "0 14px"
    height: "32px"
  segmented-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
  tab-selected:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "44px"
  dialog-center:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "34rem"
  dialog-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    width: "36rem"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.kp}"
    padding: "12px 16px"
  save-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.kp}"
    padding: "12px 20px"
  week-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    height: "44px"
  week-day-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.full}"
    size: "32px"
  confirmed-chip:
    backgroundColor: "{colors.confirmed}"
    textColor: "{colors.white}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 4px"
    height: "16px"
  confirmed-chip-zero:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 4px"
    height: "16px"
  campaign-span:
    backgroundColor: "{colors.badge}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "28px"
  avatar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    size: "36px"
  avatar-xs:
    typography: "{typography.caption}"
    size: "24px"
  avatar-sm:
    typography: "{typography.caption}"
    size: "28px"
  avatar-lg:
    typography: "{typography.lead}"
    size: "56px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.kp}"
    size: "40px"
  icon-button-sm:
    size: "32px"
  icon-button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
  review-segment-done:
    backgroundColor: "{colors.confirmed}"
    rounded: "{rounded.full}"
    height: "6px"
  review-segment-pending:
    backgroundColor: "rgba(47, 102, 144, 0.30)"
    rounded: "{rounded.full}"
    height: "6px"
  review-segment-problem:
    backgroundColor: "{colors.danger}"
    rounded: "{rounded.full}"
    height: "6px"
  review-segment-missing:
    backgroundColor: "transparent"
    rounded: "{rounded.full}"
    height: "6px"
  stage-step-done:
    backgroundColor: "{colors.confirmed}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    size: "28px"
  stage-step-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    size: "28px"
  stage-step-upcoming:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    size: "28px"
  stage-step-rejected:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    size: "28px"
  document-viewer:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.kp}"
    padding: "12px"
  permission-granted:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.full}"
    size: "24px"
  permission-none:
    backgroundColor: "{colors.outline}"
    rounded: "{rounded.full}"
    size: "6px"
---

# Design System: Portal K'Plan

## Overview

**Creative North Star: "La agenda de la app"**

El portal no es un producto aparte: es la app de K'Plan abierta en la computadora de la oficina. Fondo crema, texto y reglas en tinta, tarjetas blancas con borde arena, esquinas de 10 px, botones en mayúsculas con tracking y Poppins en todo. Sobre ese mundo, fijado desde la app móvil, el portal se ordena en el tiempo: la pantalla de inicio es la semana de llegadas que los itinerarios ya anuncian, y cada módulo (ficha del lugar, cupones, eventos, insignias, pagos) cuelga de esa misma agenda.

La densidad es de herramienta de trabajo diario: tipo de 14 px por defecto, filas de 44 px, paneles con 20 px de relleno, un solo tono de acento por significado. El color no decora: cada tono dice algo del dato. El azul son las visitas planeadas, el verde las confirmadas con QR, el dorado las insignias, el terracota la acción principal y el "ahora". Todo lo demás es tinta sobre crema.

Lo que resume una vista se dice en una oración con las cifras en negrita, no en una fila de tarjetas de métricas. Las superficies son planas y se separan con bordes; la sombra sólo aparece en lo que flota sobre la página.

**Key Characteristics:**
- Fondo crema (`canvas`) con barra lateral en papel de mapa (`paper`); tarjetas blancas con borde `divider`.
- Poppins 400/500/600/700 en toda la interfaz; escala tipográfica con los mismos nombres que `app_text_styles.dart`.
- Esquinas de 10 px (`rounded-kp`) en controles y contenedores.
- Un significado por color: azul planeado, verde confirmado, dorado insignias, terracota acción y ahora, tinta selección.
- Resúmenes en oraciones, cifras con números tabulares.
- Plano por defecto; la sombra marca lo que flota.

## Colors

Una paleta cálida de papel y tinta tomada tal cual de la app, donde cada acento carga un solo significado.

Los valores crudos viven en `:root` de `src/styles/theme.css` como `--kp-*`, espejo de `mobile/lib/src/core/theme/app_colors.dart`. Los componentes sólo ven los roles semánticos de `@theme static` (`--color-canvas`, `--color-brand`…), expuestos como utilidades de Tailwind (`bg-canvas`, `text-brand`, `border-divider`). `--color-*: initial` borra la paleta de Tailwind: fuera de estos roles no hay colores.

### Primary
- **Terracota K'Plan** (`brand`, `--kp-primary-30`): el botón primario (`Validar cupón`, `Entrar`, guardar), la línea y el punto de "ahora" en la agenda, el borde superior de la columna de hoy, la barra de carga de ruta bajo la barra superior, el cursor de texto y la selección de texto (al 26 %). En el mapa, el pin del lugar.
- **Terracota Profundo** (`brand-strong`, mezcla oklab de terracota 78 % con tinta): el hover del botón primario y el texto terracota sobre fondos claros, donde el terracota puro no llega a contraste: la palabra "Hoy" en la cabecera del día, los enlaces de acción ("Revisar el tiempo de visita →"), el texto de las etiquetas `brand` ("Hoy", "Llegando").
- **Blanco sobre Terracota** (`on-brand`): texto de los botones primarios.

### Secondary
- **Azul Itinerario** (`planned`, `--kp-accent-blue`): lo planeado que todavía no ocurre. Tiñe las celdas de la semana y del mes en cinco escalones según la gente esperada (8 %, 18 %, 32 %, 52 %, 100 % en la semana), las barras de la línea del día y la etiqueta "Por llegar". El build lo extiende a otros estados pendientes: estado de cuenta abierto, canje "Por validar", campaña "Programada". En la administración es lo pendiente: "Por revisar", "En revisión", "Invitación enviada", el tramo pendiente del riel de revisión (al 30 %) y las fichas de pendientes de la barra lateral (al 12 %).
- **Verde QR** (`confirmed`, `--kp-accent-green`): lo confirmado. La ficha de llegadas con QR en la cuadrícula, la etiqueta con la hora del escaneo, el canje validado, el estado de cuenta pagado, "Al día", y las barras de avance de ficha completa. En la administración, lo que pasó: documento aceptado, verificación limpia, solicitud aprobada, cuenta activa, etapa hecha.

### Tertiary
- **Oro de Medalla** (`badge`, `--kp-medal-gold`): sólo insignias y campañas. La franja de campaña sobre los días de la semana, la raya inferior de un día con campaña en el mes, el círculo `×2 / ×3 / ×5`, la barra de insignias entregadas, la etiqueta "Da insignia" y el borde de una campaña activa.
- **Oro Viejo** (`badge-deep`, mezcla oklab de oro 45 % con tinta): los íconos de medalla y destello sobre fondo claro, donde el oro puro no se lee.
- **Medalla sin ganar** (`medal-none`): el estado apagado de un multiplicador no elegido en el editor de campaña.

### Neutral
- **Tinta** (`ink`, `--kp-primary-60`): todo el texto principal, reglas fuertes, el anillo de foco, la selección (día elegido, celda elegida, opción de un control segmentado, navegación activa, pestaña activa), el borde del botón secundario, los avisos y la barra de guardado, el velo de los diálogos (al 45 %). También lo actual y lo concedido: la etapa en curso, el permiso concedido, el grupo de navegación cerrado que contiene la ruta activa, la etiqueta flotante de la barra contraída.
- **Crema** (`canvas`, `--kp-primary-10`): el fondo de la página y de la barra superior; el texto sobre tinta.
- **Papel de Mapa** (`paper`, `--kp-map-land`): la barra lateral, el panel ilustrado del login, el fondo de las etiquetas neutras y de los rieles de progreso.
- **Papel Hondo** (`paper-deep`, `--kp-map-block`): hover de la navegación lateral.
- **Blanco Tarjeta** (`surface`): paneles, cuadrícula, diálogos, menús, filas.
- **Relleno de Campo** (`field`): el fondo de inputs, selects y del control segmentado.
- **Arena** (`outline`): el borde de los campos y del control segmentado, el switch apagado, las barras de desplazamiento. Al 60 %, la regla derecha de la barra lateral y la regla sobre la cuenta; al 70 %, la guía de la que cuelgan los hijos de un grupo. El contorno de la etapa por venir y el punto de permiso no concedido.
- **Arena Clara** (`divider`): el borde de las tarjetas y todas las reglas internas (cabeceras de panel, filas, celdas).
- **Gris Texto** (`muted`, `--kp-secondary-text`): texto secundario, descripciones, cabeceras de tabla.
- **Gris Ayuda** (`hint`, mezcla oklab de `--kp-hint-text` 58 % con tinta): placeholders y "Opcional". El gris de la app no llega a 4.5:1 sobre blanco; se oscurece con tinta.
- **Marcador** (`placeholder`): los esqueletos de carga.

### Contenido y mapa
- **Error** (`danger`, `--kp-error`): errores de campo, botón destructivo, "No llegó", estado de cuenta vencido, y la barra del motivo de abandono más frecuente. En la administración, lo que no pasó o se detuvo: rechazado, con observaciones, suspendido, documento vencido, documento que falta (contorno punteado al 60 %), y el tiempo en una etapa cuando pasa de 3 días.
- **Estrella** (`star`) y **chips de categoría** (`chip-city`, `chip-nature`, `chip-culture`): sólo dentro de la vista previa del teléfono y en la calificación de la ficha, copiados de la app.
- **Mapa** (`map-land`, `map-water`, `map-park`): el mapa de MapLibre se recolorea leyendo estas variables en tiempo de ejecución, para que se vea como el mapa de papel de la app.

### Named Rules
**The Una Línea Rule.** Un color se cambia en una sola línea de `:root` (y en la app). Ningún componente escribe un hex ni un valor arbitrario; si falta un tono, se agrega un `--kp-*` y un rol en `@theme`.

**The Un Significado Rule.** Azul es planeado o pendiente, verde es confirmado, dorado es insignia o campaña, terracota es acción principal, enlace de acción, hoy y ahora. La selección y lo activo son tinta, nunca un acento.

**The El Cero No Es Verde Rule.** Una cuenta de confirmados en cero se dibuja como ficha neutra con borde de tinta al 25 % sobre blanco y número en `muted`. El verde aparece sólo cuando alguien escaneó el QR.

**The Estado De Revisión Rule.** Los estados de revisión y de cuenta usan los mismos cuatro tonos. Azul: pendiente, sigue su curso ("Por revisar", "En revisión", "Invitación enviada"). Verde: pasó (aceptado, aprobado, activo). Rojo: no pasó o se detuvo (rechazado, con observaciones, suspendido). Neutro: se devolvió para que la otra persona corrija ("Corrección pedida"). El tiempo de espera se pone rojo sólo cuando una solicitud lleva más de 3 días en una etapa esperando al equipo.

## Typography

**Display Font:** Poppins (con ui-sans-serif, system-ui, sans-serif)
**Body Font:** Poppins (con ui-sans-serif, system-ui, sans-serif)

**Character:** Una sola geométrica amable, la misma de la app, cargada desde `@fontsource/poppins` en 400, 500, 600 y 700. La jerarquía sale del peso y del tamaño, no de otra familia.

La escala vive en `@theme` con `--text-*: initial`, así que sólo existen los pasos con nombre de `app_text_styles.dart`: `text-caption`, `text-small`, `text-body`, `text-lead`, `text-title`, `text-heading`, `text-headline`, `text-display`, cada uno con su interlineado.

### Hierarchy
- **Display** (700, 40 px / 44 px, tracking -0.025em): sólo la frase grande del panel ilustrado del login.
- **Headline** (700, 28 px / 34 px, tracking -0.025em): el título de cada página (`PageHeader`, el rango de la semana en la agenda, el nombre del lugar en el editor).
- **Heading** (700, 22 px / 28 px): el nombre del lugar en el cartel QR y en la vista previa del teléfono, el día del mes en la fecha de un evento.
- **Title** (600, 18 px / 24 px): títulos de panel, de diálogo y del panel del día; totales de dinero (en 700).
- **Lead** (400, 16 px / 24 px): la oración de resumen de cada vista, en `muted` con cifras en `ink` 600, a 76–84 ch; títulos de estados vacíos (en 600); los números del día en la cabecera de la semana (en 600).
- **Body** (400, 14 px / 22 px): el tamaño por defecto del documento; filas, navegación (500), pestañas (500), campos. Descripciones de página a 68 ch como máximo.
- **Small** (400, 13 px / 20 px): líneas secundarias, etiquetas de campo (500), los datos de cada grupo en el panel del día, el texto de los botones medianos.
- **Caption** (400, 12 px / 18 px): ayudas de campo, horas de la cuadrícula, subtítulos; en 600 para etiquetas y fichas.
- **Label** (600, 12 px, tracking 0.06em, mayúsculas): cabeceras de columna: tablas, días de la semana ("LUN", "HOY"), meses cortos, fases del día ("MAÑANA", "MEDIODÍA").
- **Button** (600, 13 px, tracking 0.06em, mayúsculas): botones primario, secundario y destructivo.

### Named Rules
**The Números Tabulares Rule.** Toda cifra que se compara o se alinea (personas, horas, dinero, conteos de pestaña, columnas numéricas de tabla) lleva `tabular-nums`. Las columnas alineadas a la derecha lo aplican solas.

**The Mayúsculas Para Actuar Rule.** Las mayúsculas con tracking (`tracking-label`) son para los botones de acción y para las cabeceras de columna de los datos. No se usan como antetítulo sobre un encabezado ni como adorno de sección.

## Layout

Una barra lateral a la izquierda desde `lg` (1024 px), pegada a toda la altura de la ventana, de 16.5 rem extendida y 4.5 rem contraída; la persona la contrae y el navegador lo recuerda. El cambio de ancho se anima en 200 ms con `ease-out-expo` y el contenido se reacomoda con él (columna `auto` + `minmax(0,1fr)`). A la derecha, el contenido con barra superior pegajosa de 64 px (`h-16`) en crema con regla inferior. Por debajo de `lg`, la barra lateral se convierte en un cajón (`<dialog>` nativo de 17 rem, máximo 85 vw) que se abre desde el ícono de menú y siempre va extendido.

El contenido principal tiene márgenes de 16 px en móvil, 24 px desde `sm` y 32 px desde `lg`, con 32 px verticales en escritorio. No hay contenedor de ancho máximo: la agenda y las tablas usan todo el ancho; el texto corrido se limita por medida en `ch` (46 a 84 ch según el papel).

El patrón de página recurrente es una columna flexible más un panel lateral de ancho fijo: la agenda (`minmax(0,1fr)` + 22 rem desde `xl`), el detalle de una organización, el de una solicitud de guía y los cobros (22 rem, 22 rem y 20 rem desde `lg`), el editor del lugar con la vista previa del teléfono (20.5 rem desde `xl`). El panel lateral de la agenda queda pegado a 96 px del borde superior. Por debajo del punto de corte, el panel cae debajo de la columna.

El ritmo sale de la escala de 4 px de Tailwind: 8 px entre controles, 12 px entre elementos de una fila, 20 px de relleno en paneles y entre bloques de la agenda, 24 px entre columnas. La cuadrícula de la semana tiene un mínimo de 46 rem y se desplaza en horizontal en pantallas angostas, abriendo en la columna del día elegido.

## Elevation & Depth

Un sistema plano con capas tonales: crema, papel y blanco se separan con bordes arena, no con sombra. La profundidad aparece sólo en lo que flota sobre la página (diálogos, menús, avisos, barra de guardado, pin del mapa, el teléfono de la vista previa) y en levantamientos mínimos de piezas pequeñas.

### Shadow Vocabulary
- **Raise** (`--shadow-raise`: `0 1px 2px` tinta al 8 %): la perilla del switch, el número de la celda que cruza la línea de "ahora", los íconos flotantes de la vista previa, el cartel QR en pantalla, la imagen del documento sobre el papel del visor.
- **Pop** (`--shadow-pop`: `0 18px 40px -12px` tinta al 30 % más `0 2px 6px` tinta al 8 %): diálogos, menús, avisos, barra de guardado, pin del mapa, marco del teléfono, y la etiqueta y el submenú que flotan junto a la barra lateral contraída.
- **Anillos de estado** (sombras `inset`, no elevación): celda elegida o enfocada con anillo interior de 2 px en tinta, hover de celda con 1 px, columna de hoy con raya superior de 3 px en terracota, campaña activa con raya superior de 4 px en oro. Marcan estado sin mover el diseño.

### Named Rules
**The Plano En Reposo Rule.** Paneles, tarjetas, tablas y la cuadrícula no llevan sombra. Si algo necesita separarse de la página, se le da borde `divider` sobre `surface`.

**The Sólo Flota Lo Que Tapa Rule.** `shadow-pop` es para lo que se superpone al contenido. Siempre va con su animación de entrada (`animate-rise`, `animate-slide-in` o `animate-fade`).

## Shapes

Esquinas suaves de 10 px (`rounded-kp`, `AppTheme.radius` de la app) en todo control y contenedor: botones, campos, paneles, la cuadrícula, menús, avisos, ítems de navegación, esqueletos. Las piezas pequeñas dentro de un contenedor usan 6 px (`rounded-sm`): etiquetas, fichas de la cuadrícula, franjas de campaña, eventos del día, ítems de menú y del submenú flotante, fichas de pendientes, la etiqueta flotante de la barra contraída, la imagen dentro del visor de documentos. Las opciones del control segmentado usan 8 px para anidar dentro de su marco de 10 px. Los diálogos centrados y el cartel QR usan 16 px (`rounded-lg`); el diálogo lateral no tiene esquinas. Círculos completos para avatares, números de día, el switch, los rieles de progreso y de revisión, los pasos de etapa, los puntos del historial y de pendientes, las marcas de permiso y los íconos de estado vacío.

Los bordes son de 1 px: `divider` en tarjetas y reglas, `outline` en campos. El botón secundario usa 1.5 px en tinta. Las franjas de campaña que siguen en la semana anterior o siguiente pierden la esquina de ese lado.

### Named Rules
**The Diez Píxeles Rule.** Toda superficie o control nuevo usa `rounded-kp`. Los otros radios existen sólo para lo anidado (6 px, 8 px), para lo que flota o se imprime (16 px) y para lo circular.

## Components

### Buttons
Firmes y claros, como los de la app: mayúsculas con tracking en toda acción que cambia algo.
- **Shape:** esquinas de 10 px (`rounded-kp`); alto 32 / 40 / 48 px (`sm` / `md` / `lg`), relleno horizontal 12 / 16 / 24 px, texto 12 / 13 / 14 px en 600.
- **Primary:** terracota con texto blanco, en mayúsculas con tracking 0.06em. Uno por vista; en la barra superior es "Validar cupón".
- **Hover / Focus:** hover a `brand-strong`; transición de 150 ms en color y fondo; al presionar baja 1 px (`active:translate-y-px`); foco con contorno de tinta de 2 px a 2 px de distancia. Deshabilitado al 45 % de opacidad; en carga muestra un spinner en lugar del ícono.
- **Secondary:** borde de tinta de 1.5 px, texto en tinta, mayúsculas; hover con tinta al 6 %.
- **Danger:** fondo `danger`, texto blanco, mayúsculas.
- **Ghost:** tinta sin borde ni mayúsculas, hover con tinta al 6 %. **Quiet:** texto `danger` sin fondo para acciones destructivas menores ("Cancelar campaña").
- **IconButton:** cuadrado de 32 o 40 px (`size` `sm` / `md`), 10 px de radio, con `aria-label` y `title` obligatorios; deshabilitado al 40 %. Dos tonos por `tone`: `default` en tinta con hover de tinta al 6 %, y `danger` en rojo con hover de rojo al 8 % para quitar, borrar o suspender desde una fila. El tono se elige con la prop, nunca sobrescribiendo clases.

### Chips
- **Style (`Tag`):** 24 px de alto, 6 px de radio, 8 px de relleno, 12 px en 600. Tonos: `neutral` (papel y gris), `planned` (azul al 10 % con texto azul), `confirmed` (verde al 10 % con texto verde), `badge` (oro con texto tinta), `brand` (terracota al 12 % con texto terracota profundo), `danger` (rojo al 10 %), `ink` (tinta con texto crema, para la hora elegida y el rol admin), `outline` (borde arena).
- **State:** los estados de un grupo son fijos: "Por llegar" azul, "Llegando" terracota, hora del QR en verde con ícono, "No llegó" rojo, "Sin confirmar" neutro. En la administración siguen The Estado De Revisión Rule: "Por revisar", "En revisión" e "Invitación enviada" azules; aceptado, aprobado y activo verdes; rechazado, con observaciones y suspendido rojos; "Corrección pedida" neutra; "Sin responsable" en `outline`.

### Avatar
- **Style:** círculo de tinta con las iniciales en crema (600). Es decorativo (`aria-hidden`): el nombre va escrito al lado.
- **Tamaños (`size`):** `xs` 24 px en menús junto a un nombre, `sm` 28 px en columnas de responsable y filas del equipo, `md` 36 px por defecto (la cuenta en la barra lateral), `lg` 56 px en la cabecera de la ficha de un usuario. Iniciales en `caption` (xs, sm), `small` (md) o `lead` (lg). El tamaño se elige con la prop, nunca sobrescribiendo clases.

### Cards / Containers
- **Corner Style:** 10 px (`rounded-kp`).
- **Background:** `surface` sobre `canvas`.
- **Shadow Strategy:** ninguna en reposo (ver Elevation & Depth).
- **Border:** 1 px `divider`; la cabecera del panel se separa con la misma regla.
- **Internal Padding:** cabecera de 20 × 16 px con título `title` y descripción `small` en `muted`; cuerpo de 20 px. Las filas de lista usan 20 × 12 px con reglas `divider` entre ellas.

### Inputs / Fields
- **Style:** 40 px de alto, fondo `field`, borde de 1 px `outline`, 10 px de radio, 12 px de relleno, texto `body` en tinta, placeholder en `hint`, cursor terracota. Los prefijos y sufijos fijos ("C$", "insignias") van en `muted` dentro del campo.
- **Focus:** borde en tinta más un anillo de 1 px en tinta (`0 0 0 1px`); hover con borde de tinta al 40 %.
- **Error / Disabled:** `aria-invalid` pasa el borde y el anillo a `danger`, con el mensaje en `caption` 500 rojo debajo; deshabilitado al 60 %.
- **Field:** etiqueta `small` 500 en tinta, "Opcional" en `hint` a la derecha, ayuda en `caption` `muted`, todo enlazado por id.
- **Switch:** 44 × 24 px, tinta encendido y arena apagado, perilla blanca con `shadow-raise`, 200 ms con `ease-out-expo`. **Checkbox:** nativo con `accent-color` de tinta.

### Navigation
- **Barra lateral:** fondo `paper`, regla derecha en arena al 60 %. Cabecera de 64 px fuera del área que se desplaza: arriba a la izquierda el botón de contraer (ícono de panel de 19 px, cuadro de 40 px, tinta al 80 %, hover `paper-deep`) y a su derecha el logotipo en tinta de 36 px. Ítems de 40 px con ícono lineal de 18 px (trazo 1.75) y texto `body` 500 en tinta al 80 %; hover con `paper-deep`; activo con fondo tinta y texto crema. Abajo, tras una regla arena al 60 %, la cuenta con avatar de tinta y menú hacia arriba.
- **Contraída (escritorio):** 4.5 rem, sólo íconos. Las etiquetas, el logotipo, los chevrones y los datos de la cuenta se desvanecen en 150 ms mientras el ancho se anima. Al pasar o enfocar un ícono aparece su nombre en una etiqueta de tinta con texto crema (`caption` 600, 6 px de radio, `shadow-pop`, entrada `fade`) 8 px a la derecha de la barra. El ícono de un grupo abre un submenú flotante a la misma altura: tarjeta blanca con borde `divider`, 10 px de radio, `shadow-pop`, entrada `rise`, con el nombre del grupo en `small` 600 y sus enlaces de 36 px (hover crema, activo en tinta). Al abrirse, el foco pasa al primer enlace; un clic fuera lo cierra, y Escape lo cierra y devuelve el foco al ícono.
- **Grupos (extendida):** en el equipo de K'Plan los módulos se agrupan (Contenido, Usuarios, Finanzas) bajo un ítem con chevron `muted` que gira 180° al abrir. Los hijos cuelgan 24 px adentro de una guía vertical en arena al 70 %, en ítems de 36 px con texto `body` en tinta al 75 %; el activo en tinta con texto crema y 500. La altura se abre y se cierra animando las filas de la cuadrícula en 200 ms con `ease-out-expo`. Cada grupo recuerda si se dejó abierto o cerrado; sin preferencia, abre el que contiene la ruta actual. Un grupo cerrado (o la barra contraída) que contiene la ruta activa pinta el ítem del grupo en tinta, como activo.
- **Pendientes:** el número por revisar va junto a la etiqueta en una ficha de `planned` al 12 % con texto azul (`caption` 600, 6 px de radio, tabular); sobre el ítem activo se invierte a crema al 15 % con texto crema. Contraída, se reduce a un punto azul de 8 px con anillo `paper` en la esquina del ícono, y el número pasa a la etiqueta accesible.
- **Por permisos:** el menú del equipo K'Plan se arma con los permisos del rol. Un grupo sin hijos visibles desaparece; uno con un solo hijo se vuelve enlace directo con el ícono del grupo.
- **Cajón móvil:** la misma barra, siempre extendida y sin botón de contraer; los grupos funcionan igual.
- **Barra superior:** 64 px, crema, regla inferior `divider`; nombre de la organización en `body` 600, tipo y ciudad en `small` `muted`, acción primaria a la derecha. En móvil muestra el isologo y el botón de menú.
- **Tabs:** 44 px, `body` 500, subrayado de 2 px en tinta para la activa, contador en ficha de tinta (activa) o papel. Flechas del teclado para moverse.
- **SegmentedControl:** marco `field` con borde arena y 2 px de relleno; opción elegida en tinta con texto crema; flechas del teclado (Día · Semana · Mes, ×2 · ×3 · ×5).

**The Mismo Lugar Rule.** Contraer la barra lateral no mueve nada: el botón de contraer, cada ícono y el avatar quedan en la misma x en los dos estados (centrados a 36 px del borde, el centro de la barra contraída). Sólo aparece o desaparece el texto.

### Dialogs, avisos y guardado
- **Dialog:** sobre `<dialog>` nativo, fondo `surface`, velo de tinta al 45 %, `shadow-pop`. Variante centrada de 26 / 34 / 46 rem con 16 px de radio y entrada `rise`; variante lateral (`sheet`) a toda altura desde la derecha, 28 / 36 / 44 rem, entrada `slide-in`, para formularios largos. Cabecera y pie con reglas `divider`; el pie en crema al 50 % con las acciones a la derecha.
- **Toast:** tinta con texto crema, 10 px de radio, abajo a la derecha, máximo tres, 4.5 s (7 s si es error).
- **SaveBar:** barra de tinta pegada abajo con los cambios sin guardar.

### Tablas y estados
- **Table:** cabeceras en `label` `muted` sobre blanco; celdas de 16 × 12 px con regla inferior `divider`; filas interactivas con hover crema; números a la derecha y tabulares.
- **EmptyState:** círculo de 48 px en papel con ícono en tinta, título `lead` 600 y una línea que dice qué hacer, con acción opcional. **ErrorState:** igual con círculo rojo al 10 % y botón "Reintentar" secundario.
- **Skeleton:** bloques `placeholder` con 10 px de radio y pulso.

### Verificación y equipo
Las piezas de la administración de K'Plan: la cola de guías y traductores, su expediente y los roles del equipo.
- **Riel de revisión (`ReviewSegments`):** un tramo por documento o verificación obligatoria, píldoras de 6 px de alto, 12 px mínimo y 4 px entre ellas: verde aceptado o limpio, `planned` al 30 % por revisar, rojo rechazado u observado, contorno rojo punteado al 60 % si nunca se subió. Debajo, la cuenta en `caption` tabular ("3 de 5 documentos"). Cada tramo lleva su nombre en `title` y el riel se lee como una imagen con la lista completa.
- **Espera:** el tiempo en la etapa va en `small` 600 tabular con "desde…" en `caption` `muted`; pasa a `danger` cuando supera 3 días. La oración de resumen de la cola aplica lo mismo a la solicitud que más espera.
- **Etapas (`StageTrack`):** panel con los tres pasos (Documentos, Antecedentes, Decisión), en columnas desde `sm` unidas por un riel de 2 px (verde tras un paso hecho, `divider` si no). Círculo de 28 px: verde con palomita si está hecho, tinta con el número si es el actual (o espera al guía), contorno arena con número `muted` si viene después, rojo con equis si se rechazó. Debajo, el nombre en `body` 600, el avance en `small` `muted` y cuánto lleva ahí. Un pie con regla `divider` junta las acciones de etapa a la derecha y, a la izquierda, la oración "**Para avanzar:** …" que dice qué falta, o "Todo listo para pasar a la siguiente etapa."
- **Revisión de documento:** diálogo lateral grande. Arriba, el visor: el archivo ajustado dentro de una caja de papel de altura fija (34 % de la ventana, mínimo 13 rem; `paper`, borde `divider`, 12 px de relleno) para que la lista de revisión quede a la vista. Encima de la caja, control segmentado pequeño Frente · Reverso cuando hay varias caras, zoom Ajustado · 150 % · 250 % con botones de ícono (también con clic en la imagen) y "Abrir original" fantasma; debajo, el nombre del archivo en `caption`. Luego los datos del documento en tres columnas (vencido en `danger` 600) y "Lo que se revisa" con su etiqueta de estado y una casilla por punto. "Aceptar documento" queda deshabilitado hasta marcar todo; el pie cuenta en vivo "Falta marcar N de M" y lleva anterior · "N de M" · siguiente a la izquierda. Rechazar exige la nota que el guía lee en la app. Al decidir, pasa solo al siguiente documento pendiente.
- **Historial:** línea de tiempo vertical, regla `divider` de 1 px y puntos de 8 px: tinta al enviar, contorno de tinta al 40 % al asignar, verde al aceptar, limpiar o aprobar, rojo al rechazar, observar o pedir corrección, azul al cambiar de etapa. El hecho en `small` tinta; quién y cuándo en `caption` `muted`. Lo más reciente arriba.
- **Matriz de roles y permisos:** tabla dentro de una tarjeta que se desplaza de lado. La primera columna (permiso en `body` 500 con descripción `caption` `muted` a 38 ch) queda pegada a la izquierda sobre blanco. Cada rol es una columna de 7 rem con su nombre en `small` 600 y cuántas personas lo tienen; los roles de sistema llevan candado y no se editan, los demás se abren tocando el nombre (lápiz al pasar). Concedido: círculo de tinta de 24 px con palomita crema. No concedido: punto arena de 6 px. Las filas de grupo van en crema con el nombre en `small` 600. Sólo cuando la tabla desborda aparecen "Hay más roles a la derecha →" en `small` `muted` arriba y un desvanecido de blanco de 48 px en el borde derecho.

### Agenda de la semana
La pieza que define el portal: una tabla con `role="grid"` de siete columnas de día y filas de una hora, agrupadas por fase (Mañana, Mediodía, Tarde, Noche) con la fase escrita en vertical en una canaleta pegajosa.
- **Cabecera del día:** número en círculo de 32 px (tinta con texto crema si está elegido), día corto en `label` (terracota profundo "HOY" para hoy), y total de personas con ícono. La columna de hoy lleva raya superior terracota de 3 px.
- **Franjas encima de los días:** campañas como barras doradas de 28 px que cruzan los días que cubren; eventos como tarjetitas crema con borde de tinta al 15 %.
- **Celdas:** 44 px, teñidas de azul en cinco escalones según la gente esperada; el número en `figure` (blanco sobre el azul pleno). En horas pasadas, la ficha de confirmados abajo a la derecha: verde con palomita y número, o neutra en cero.
- **Ahora:** una línea terracota de 2 px con punto de 8 px cruza la celda a la altura del minuto actual, por detrás del número.
- **Interacción:** elegir una celda filtra el panel del día a quien está presente en esa hora; las flechas recorren la cuadrícula, Inicio y Fin saltan a la primera y última hora, Escape vuelve al día completo. Elegida con anillo interior de 2 px en tinta.
- **Panel del día:** tarjeta pegajosa a la derecha con el día, una línea de totales, y la lista de grupos (hora de llegada y salida tabulares, personas, circuito, etiqueta de estado).
- **Vistas hermanas:** `DayTimeline` (barras azules con relleno verde de confirmados) y `MonthCalendar` (días teñidos de azul, hoy en círculo terracota, raya dorada si hay campaña) con el mismo panel.

### Vista previa del teléfono
`AppPreview` dibuja la ficha del lugar tal como la ve el turista, dentro de un marco de tinta de 2.6 rem de radio con `shadow-pop`. Adentro copia la pantalla de parada de la app, incluidos su botón terracota, sus chips de categoría, la estrella y sus tamaños de texto reducidos (9–12 px). Es una réplica de la app, no un patrón del portal: sus tamaños y usos de terracota no se reutilizan fuera de ella.

## Do's and Don'ts

### Do:
- **Do** usar sólo los roles de `@theme` (`bg-canvas`, `text-ink`, `border-divider`, `bg-brand`…); un color nuevo entra como `--kp-*` en `:root` y un rol en `@theme`.
- **Do** reservar el azul `planned` para lo planeado o pendiente, el verde `confirmed` para lo confirmado, el oro `badge` para insignias y campañas, y el terracota `brand` para la acción principal, los enlaces de acción, hoy y ahora.
- **Do** marcar la selección y lo activo con tinta: fondo `ink` con texto `canvas`, o anillo interior de 2 px en tinta.
- **Do** resumir cada vista con una oración en `text-lead` `muted` con las cifras en `ink` 600.
- **Do** usar `rounded-kp` (10 px) en todo control y contenedor nuevo, y `rounded-sm` (6 px) para lo que va adentro.
- **Do** poner `tabular-nums` en toda cifra que se compara o se alinea.
- **Do** separar superficies con borde `divider` sobre `surface`, y reservar `shadow-pop` para lo que flota.
- **Do** usar `text-brand-strong`, no `text-brand`, para texto terracota sobre fondos claros, y `text-badge-deep` para íconos dorados.
- **Do** animar sólo con los tokens (`animate-rise` 220 ms, `animate-fade` 180 ms, `animate-slide-in` 260 ms, `ease-out-expo`), transiciones de estado de 150 ms y 200 ms con `ease-out-expo` para lo que cambia de tamaño o gira (switch, ancho de la barra lateral, grupos, chevron); `prefers-reduced-motion` las apaga todas.
- **Do** pintar los estados de revisión y de cuenta con The Estado De Revisión Rule: azul pendiente, verde pasó, rojo no pasó o se detuvo, neutro devuelto para corregir.
- **Do** elegir el tamaño del avatar con `size` (`xs` 24, `sm` 28, `md` 36, `lg` 56 px) y el tono del botón de ícono con `tone` (`default`, `danger`).

### Don't:
- **Don't** escribir un hex, un `rgb()` ni un color arbitrario en un componente.
- **Don't** pintar de verde una cuenta en cero ni nada que no esté confirmado.
- **Don't** usar el oro fuera de insignias y campañas, ni el terracota como relleno decorativo, color de categoría o fondo de estado.
- **Don't** resumir una vista con una fila de tarjetas de métricas, un gráfico de línea y una tabla.
- **Don't** agregar sombra a paneles, tarjetas o tablas en reposo.
- **Don't** usar otra familia tipográfica que Poppins, ni tamaños fuera de la escala con nombre fuera de la vista previa del teléfono.
- **Don't** usar mayúsculas con tracking como antetítulo sobre un encabezado.
- **Don't** usar radios fuera de 6, 10 y 16 px y el círculo, salvo el marco del teléfono.
- **Don't** sobrescribir con `className` el color o el tamaño de `Avatar` e `IconButton`; si falta una variante, se agrega a la prop.
- **Don't** mover los íconos de la barra lateral al contraerla, ni poner el botón de contraer dentro del área que se desplaza.
