---
icon: lucide/palette
---

# Diseño del portal K'Plan

**Perfil operativo · revisión 29/09/2026.** Norma transversal: `DESIGN_SYSTEM.md`. Este archivo describe la presentación adoptada en el portal. La [bitácora](bitacora.md), la [especificación de migración](migracion.md) y la [auditoría](auditoria-marca.md) documentan las decisiones y su verificación.

## 1. Dirección y alcance

Una herramienta cálida, clara y ordenada en el tiempo. La agenda organiza las llegadas; los formularios permiten preparar la ficha del lugar; las tablas y expedientes facilitan el trabajo del equipo. Se mantiene la identidad compartida con móvil y landing mediante Poppins, crema, carbón, terracota, iconografía e ilustración original. La densidad responde a las tareas de escritorio.

La implementación cambia CSS, tokens y clases de presentación. Arquitectura, rutas, permisos, modelos, mocks, formularios, textos, eventos y validaciones conservan su comportamiento. Las descripciones de dominio al final son contexto del producto existente, no nuevas especificaciones funcionales.

Prioridad documental: sistema de marca → perfil operativo de este archivo → implementación y evidencia de migración. Las referencias históricas a archivos Dart del móvil no son dependencias disponibles en este checkout.

## 2. Color y semántica

Los primitivos viven en :root de src/styles/theme.css. @theme static expone los roles como utilidades Tailwind. No se añaden valores HEX dentro de componentes.

| Rol | Valor | Aplicación |
| --- | --- | --- |
| canvas | #F8F4E6 | Lienzo general. |
| surface / field | #FFFFFF | Paneles, navegación, cabecera y campos. |
| ink | #1E2022 | Texto principal, selección lateral, segmentos y barra de guardado. |
| muted | #5C5C5C | Texto secundario. |
| brand | #D95D39 | Identidad, pin del mapa, ahora y señales de progreso. |
| action / focus | #B74728 | Primario con blanco, pestaña activa, foco y caret. |
| action-hover / brand-strong | #983A20 | Hover primario y texto terracota sobre fondos claros. |
| on-action | #FFFFFF | Texto sobre acción; contraste calculado 5,32:1. |
| field-outline | #858E8B | Contorno funcional de campos y secundario; 3,37:1 sobre blanco. |
| outline | #CFC7B4 | Bordes secundarios, scroll y huecos; no sustituye al contorno funcional. |
| divider | #E6E0D0 | Separación de superficies y filas. |
| paper / paper-deep | #F1E8D2 / #EBDFC4 | Mapa, etiquetas neutras y elementos secundarios. |
| planned | #2F6690 | Planificado o pendiente. |
| confirmed | #2D6A4F | Confirmado, aceptado o activo. |
| danger | #B3261E | Error, rechazo y acciones destructivas existentes. |
| badge | #E0B84C | Medallas y campañas, preservando su significado. |

Se conservan colores de categorías, mapas, medallas y estrellas. El oro operativo no se sustituye por el amarillo de recompensa de marca. Un estado siempre conserva su etiqueta o icono; el color acompaña el significado. Cero confirmados sigue neutro. La selección de texto usa brand al 26 %; hint y badge-deep siguen sus mezclas operativas definidas en theme.css.

## 3. Tipografía

Poppins 400/500/600/700, con respaldo ui-sans-serif, system-ui, sans-serif. Inknut se reserva para aplicaciones editoriales de la marca; este perfil operativo utiliza Poppins.

| Nivel | Tamaño / interlineado | Uso |
| --- | --- | --- |
| display | 40 / 44 px | Frase del acceso. |
| headline | 28 / 34 px | Título de página y paso. |
| heading | 22 / 28 px | Fechas destacadas y vista previa. |
| title | 18 / 24 px | Paneles y diálogos. |
| lead | 16 / 24 px | Resúmenes; campos por debajo de 640 px. |
| body | 14 / 22 px | Formularios de escritorio, navegación y datos. |
| small | 13 / 20 px | Etiquetas de campo, texto secundario y cabeceras de tabla. |
| caption | 12 / 18 px | Ayuda, estados y horas. |

Botones: peso 600, 13/14/16 px según sm/md/lg, sin transformación a mayúsculas ni tracking agregado. Se conserva la capitalización del copy. Mayúsculas compactas continúan en días, meses y fases del calendario. Cifras comparables usan tabular-nums. Resúmenes principales y descripciones de panel: máximo 72 ch; descripción de PageHeader: 68 ch. La miniatura del teléfono conserva texto de 9–12 px y no ofrece controles operables.

## 4. Composición y navegación

- Lienzo crema, superficies blancas y borde suave; sombras solo en elementos flotantes.
- Sidebar desde lg (1024 px): 264 px extendida, 72 px contraída, fondo blanco. Su cabecera conserva 64 px; enlaces y botón de contraer tienen objetivo mínimo de 44 px. La selección sigue carbón con crema y el hover usa canvas. Se conserva el comportamiento por permisos y los grupos.
- Topbar: mínimo 72 px, blanca y con regla inferior. Conserva su contenido y acciones por rol.
- Drawer móvil nativo: ancho mínimo entre 17 rem y 85 vw, fondo blanco. Mantiene foco, cierre y navegación existentes.
- Flyout contraído: límite inferior y scroll vertical para que todos los enlaces ampliados sigan alcanzables.
- Contenido: ancho máximo 100 rem (1600 px), ancho mínimo 0; márgenes de 16/24/32 px en móvil/sm/lg, espacio vertical 24/32 px.
- PageHeader: título legible, descripción y acciones que envuelven; separador inferior y 24 px antes del contenido siguiente.
- Acceso y postulación: columna del formulario blanca en escritorio y lienzo crema en móvil; lateral crema con ilustración o guía original. Se mantienen los pasos y el orden de lectura.
- Grillas principales: mínimo de columna 0; la columna secundaria cae debajo según los puntos de corte existentes. La agenda semanal conserva mínimo de 46 rem y scroll interno.

## 5. Geometría, espacios y movimiento

Escala de 4 px: 8 entre controles, 12 entre elementos, 16 en espacios móviles y 24 entre secciones. Paneles: relleno 16 px móvil / 24 px desde sm, salvo listas o vistas cuya densidad requiere un bodyClassName específico. Cabecera de panel: 20 px verticales y 16/24 px horizontales.

Radios: 6 px en tags y opciones anidadas; 10 px en controles, navegación y menús; 12 px en paneles, tabla, agenda y barra de guardado; 16 px en diálogos centrados y cartel QR. Círculo para avatares, días, track del switch y etapas. El marco del teléfono conserva su geometría particular.

Borde de panel: divider, 1 px. Borde funcional: field-outline, 1 px. Estados vacíos usan superficie blanca y borde punteado outline. No se añade sombra a tarjetas en reposo. Se mantienen shadow-raise y shadow-pop existentes para elementos elevados.

No se añade movimiento. Se conservan transiciones de estado, sidebar y diálogos. prefers-reduced-motion limita animación y transición a 0,01 ms. Foco general de 2 px en focus, offset 5 px; pestañas y segmentos lo dibujan hacia dentro para evitar recorte en scroll.

## 6. Contratos de presentación de componentes

| Componente | Regla adoptada | Estados y límites |
| --- | --- | --- |
| Button | Altura mínima 44/48/52 px; ancho mínimo 44; radio 10; texto adaptable. | Primario action/on-action, hover action-hover; secundario blanco y borde funcional; disabled conserva la semántica y opacidad existentes. |
| IconButton | 44 px sm / 48 px md; icono conserva su tamaño. | Tono normal o danger; etiqueta accesible original. |
| Input / Select / Textarea | Campo blanco; borde funcional; Input/Select 48 px; texto 16 móvil y 14 escritorio; radio 10. | Error rojo y ayuda asociada por id; foco de 2 px y offset 5. |
| Checkbox | Casilla nativa 20 px, etiqueta con alto mínimo 44 px. | Accent carbón; texto y descripción conservados. |
| Switch | Objetivo 44 × 44; pista 44 × 24; perilla 20. | Encendido carbón, apagado field-outline; estado y evento originales. |
| SegmentedControl | Opciones de mínimo 44 px, radio 6, pueden envolver por contenido. | Activa carbón/crema; teclado original; ancho mínimo 0 en marco. |
| Tabs | Mínimo 48 px, scroll horizontal interno. | Activa en acción, subrayado 2 px y contador acción/blanco; navegación por flechas conservada. |
| Panel | Blanco, borde divider, radio 12, min-width 0. | Cabecera y acciones envuelven; relleno 16/24. |
| Table | Marco de 12 px, cabecera crema tenue y texto small sin mayúsculas añadidas; celdas 16 px verticales. | Scroll dentro del marco; foco y hover crema; manija de redimensionar existente de 12 px, operable con teclado. |
| Dialog | Nativo, superficie blanca; relleno 16/24; centro de radio 16 o sheet lateral. | Foco, Escape, confirmación y tamaños existentes. |
| Menu / Toast | Menú con filas mínimas 44; cierre de toast 44. | Semántica, tiempos y orden existentes. |
| SaveBar | Carbón, radio 12 y acciones con envoltura. | Solo aparece según los estados ya implementados. |
| Empty / Error | Blanco, borde punteado y radio 12; icono 48. | Vacío: mosaico de marca de radio 10; error: círculo rojo y reintento existente. |
| Skeleton | Bloques placeholder, radio 10. | Pulso existente; aria-busy/aria-hidden conservados. |

Los botones locales reciben mínimo de 44 × 44 por CSS base. Los controles propios de MapLibre conservan su geometría; los enlaces dentro de prosa y las manijas de tabla son excepciones registradas. Esta excepción no autoriza reducir nuevos controles.

## 7. Aplicaciones por familia

- **Agenda:** barra y filtros envuelven; resumen de 72 ch; panel de día y calendarios de 12 px. Las cantidades, fechas y colores de actividad conservan su significado.
- **Lugares:** imagen visible en móvil; completitud puede ocupar la segunda fila. Editor con columnas de mínimo cero, fotos y acciones que caben dentro del formulario; miniatura de la app con contraste de acción.
- **Eventos:** fecha y contenido en dos columnas en móvil; acciones en fila propia para no comprimir título, horario y dirección. Desde sm conserva fila horizontal.
- **Equipo:** jerarquía consistente en colas, expedientes, cobros y formularios; riel de etapas con marcadores de 32 px y pie diferenciado. Matriz de roles con primera columna mínima de 192 px y scroll contenido.
- **Circuitos:** editor de mínimo cero, paradas y horarios adaptables. La opción especial seleccionada usa action/on-action.

## 8. Referencia de dominio preservada

Las siguientes notas describen las pantallas existentes. No constituyen autorización para cambiar comportamiento ni datos en una intervención visual.

### Verificación y equipo
Las piezas de la administración de K'Plan: las colas y expedientes de guías y traductores y de solicitudes de organizaciones, y los roles del equipo. Las de revisión viven en `src/features/verification` y las usan las dos verificaciones y la solicitud vista por la organización; lo que cambia entre ellas (los pasos, a quién se espera, dónde lee la nota el solicitante) entra por props.
- **Riel de revisión (`ReviewSegments`):** un tramo por documento o verificación obligatoria, píldoras de 6 px de alto, 12 px mínimo y 4 px entre ellas: verde aceptado o limpio, `planned` al 30 % por revisar, rojo rechazado u observado, contorno rojo punteado al 60 % si nunca se subió. Debajo, la cuenta en `caption` tabular ("3 de 5 documentos"). Cada tramo lleva su nombre en `title` y el riel se lee como una imagen con la lista completa.
- **Espera:** el tiempo en la etapa va en `small` 600 tabular con "desde…" en `caption` `muted`; pasa a `danger` cuando supera 3 días. La oración de resumen de la cola aplica lo mismo a la solicitud que más espera.
- **Etapas (`StageTrack`):** panel con dos o tres pasos (Documentos, Antecedentes y Decisión para guías; Documentos y Decisión para organizaciones), en columnas desde `sm` unidas por un riel de 2 px (verde tras un paso hecho, `divider` si no). Círculo de 32 px: verde con palomita si está hecho, tinta con el número si es el actual o espera a la otra persona, contorno arena con número `muted` si viene después, rojo con equis si se rechazó. Debajo, el nombre en `body` 600, el avance en `small` `muted` y cuánto lleva ahí: "Lleva **2 días** en esta etapa", o "Esperando al guía desde hace **2 días**" cuando le toca a la otra persona. Un pie con regla `divider` junta las acciones de etapa a la derecha y, a la izquierda, la oración "**Para avanzar:** …" que dice qué falta, o "Todo listo para pasar a la siguiente etapa."
- **Revisión de documento:** diálogo lateral grande; la descripción dice cuándo se subió y si es "Obligatorio para: …" u "Opcional · …". Arriba, el visor: el archivo ajustado dentro de una caja de papel de altura fija (34 % de la ventana, mínimo 13 rem; `paper`, borde `divider`, 12 px de relleno) para que la lista de revisión quede a la vista. Encima de la caja, control segmentado pequeño Frente · Reverso cuando hay varias caras, zoom Ajustado · 150 % · 250 % con botones de ícono (también con clic en la imagen) y "Abrir original" fantasma; debajo, el nombre del archivo en `caption`. Un PDF se abre con el visor del navegador dentro de la misma caja (4 px de relleno) y sin zoom propio. Luego los datos que tenga el documento en tres columnas (vencido en `danger` 600); el bloque "Lo que declaró en la solicitud" (crema al 60 %, borde `divider`, 16 × 12 px, título `small` 600 y los datos en dos columnas, cifras en 600 tabular) con lo que el documento tiene que respaldar; y "Lo que se revisa" con su etiqueta de estado y una casilla por punto. "Aceptar documento" queda deshabilitado hasta marcar todo; el pie cuenta en vivo "Falta marcar N de M" y lleva anterior · "N de M" · siguiente a la izquierda. Rechazar exige la nota que el solicitante lee tal cual (el guía en la app, la organización en el portal). Al decidir, pasa solo al siguiente documento pendiente.
- **Lista de documentos (`DocumentsPanel`):** panel con "N de M aceptados" en la descripción y "Revisar pendientes" secundario pequeño en la cabecera. Cada fila (20 × 14 px) lleva el mosaico de 40 px en papel con el ícono de credencial o de documento, el nombre en `body` 600 con "Opcional" al lado si no es obligatorio, el archivo y el vencimiento en `small` `muted` (vencido en `danger` 600), la nota de rechazo en rojo, la etiqueta de estado y "Revisar" en terracota profundo o "Ver" en `muted`. Un obligatorio que no se subió lleva el mosaico con contorno rojo punteado y "No lo subió · obligatorio para …" en rojo; un opcional sólo aparece si lo subieron.
- **Recuadro de estado (`Notice`):** caja de 10 px de radio y 20 × 16 px de relleno con el estado de toda la solicitud: título `body` 600 y el detalle en `body` tinta a 76 ch. Tres tonos: neutro (blanco con borde de tinta al 15 %) cuando se espera una corrección, verde (borde al 30 %, fondo al 5 %, título verde) al aprobar, rojo (borde al 25 %, fondo al 5 %, título rojo) al rechazar. La misma caja roja con 16 × 12 px y título `small` marca una verificación observada o lo que se pidió corregir dentro de un panel.
- **Responsable (`AssigneeMenu`):** sin responsable, "Tomar solicitud" secundario (o "Asignar responsable" fantasma con menú si quien mira no puede tomarla, como quien llenó un alta asistida); con responsable, un botón fantasma de al menos 44 px con su avatar `sm` y "Responsable: **tú**" que abre el menú para pasarla a otra persona (avatar `xs`, "decide" en `caption` `muted` junto a quien puede decidir) o dejarla sin responsable. Ya decidida, sólo "Llevó el caso: **nombre**".
- **Decisión (`DecisionPanel`):** panel "Decisión" con lo revisado en una mirada (cifras en 600 tabular, problemas en rojo), la nota (obligatoria para rechazar) y, a la derecha, "Rechazar" en `quiet` y el primario de aprobar ("Aprobar como guía", "Aprobar y publicar"); cada decisión pasa por un diálogo de confirmación que dice qué va a pasar. Si algo impide aprobar (un lugar con dueño, un lugar nuevo sin foto o sin ubicación propia), el motivo va a la izquierda de los botones en `small` `muted`, el primario queda deshabilitado y el resumen lo marca en rojo; rechazar sigue disponible. Quien no puede decidir ve en su lugar una caja de papel que dice quién decide. "Pedir corrección" abre un diálogo centrado con la nota ya armada con lo anotado al rechazar documentos.
- **Historial:** línea de tiempo vertical, regla `divider` de 1 px y puntos de 8 px: tinta al enviar, reenviar o reemplazar un documento, contorno de tinta al 40 % al asignar, verde al aceptar, limpiar o aprobar, rojo al rechazar, observar o pedir corrección, azul al cambiar de etapa. El hecho en `small` tinta; quién y cuándo en `caption` `muted`, con el canal del solicitante ("desde la app", "desde el portal"). Lo más reciente arriba. En la vista de la organización, sus pasos se firman "Tú" y los del equipo "Equipo K'Plan".
- **Matriz de roles y permisos:** tabla dentro de una tarjeta que se desplaza de lado. La primera columna (permiso en `body` 500 con descripción `caption` `muted` a 38 ch) queda pegada a la izquierda sobre blanco. Cada rol es una columna de 7 rem con su nombre en `small` 600 y cuántas personas lo tienen; los roles de sistema llevan candado y no se editan, los demás se abren tocando el nombre (lápiz al pasar). Concedido: círculo de tinta de 24 px con palomita crema. No concedido: punto arena de 6 px. Las filas de grupo van en crema con el nombre en `small` 600. Sólo cuando la tabla desborda aparecen "Hay más roles a la derecha →" en `small` `muted` arriba y un desvanecido de blanco de 48 px en el borde derecho.

### Postulación
La entrada de negocios y alcaldías que todavía no tienen cuenta: un asistente de cinco pasos y, al enviarlo, su solicitud vista desde su lado. Reusa el mundo del login y las piezas de la verificación.
- **Entrada:** en el login, bajo el formulario, una tarjeta blanca con borde `divider` ("¿Tu negocio o alcaldía todavía no está en K'Plan?" en `small` 600 y una línea `muted`) con "Postúlate" secundario pequeño.
- **Pasos:** Tu organización · Tu lugar · Quién la representa · Documentos · Revisa y envía. Cada paso abre con su título `headline` y una línea `body` `muted` a 60 ch que dice para qué sirve; al cambiar de paso, la página vuelve arriba y el foco pasa al título.
- **Panel de pasos (desde `lg`):** la lista de pasos en el panel de papel, con los círculos de 28 px de las etapas (tinta con número el actual, verde con palomita los hechos, contorno arena los que vienen) y el nombre en `body` (600 el actual, `muted` lo que todavía no se alcanza). Un paso ya alcanzado se toca para volver, con hover `paper-deep`. Debajo, "Lo que vas a necesitar" (una viñeta de 6 px por documento, llena en tinta si es obligatorio y hueca con borde de tinta al 40 % si es opcional; nombre en 500 y emisor u "Opcional · …" en `muted`) y "Qué pasa después" en tres pasos numerados.
- **Móvil:** sobre el título, una barra de cinco tramos de 6 px (tinta hasta el paso actual, `divider` después) con "n de 5" en `caption` tabular; bajo la descripción, un desplegable nativo en papel con borde `divider` ("Qué documentos vas a necesitar" en `small` 600 y chevron que gira) con la misma guía.
- **Pie:** tras una regla `divider`, "Atrás" fantasma con flecha a la izquierda desde el segundo paso, y a la derecha el primario grande "Continuar" o, en el último paso, "Enviar solicitud".
- **Tu lugar:** los lugares sin dueño de la ciudad en una tarjeta con reglas internas y altura máxima de 20 rem (casilla de tinta, miniatura de 40 px, nombre en `body` 600, categoría y dirección en `small` `muted`, hover crema) y, debajo, un switch en tarjeta, "Mi lugar todavía no está en la app", que abre los datos del lugar nuevo tras una regla.
- **Revisa y envía:** un resumen por paso en tarjetas blancas (cabecera con título `body` 600 y "Editar" fantasma pequeño que vuelve al paso; datos en dos columnas con etiqueta `small` `muted`, valor en tinta y "—" si falta) y la casilla de declaración con su consecuencia en `caption` `muted`.
- **La solicitud de la organización ("Mi solicitud"):** la descripción del título cambia con el estado y la oración de resumen cuenta los documentos ("Van **3 de 5** documentos aceptados; tienes que subir de nuevo: **…**"). Debajo, el recuadro de estado si le piden corregir (neutro) o la rechazan (rojo), y las etapas en dos pasos con "Esperando tu corrección desde hace …" y "Mandar de nuevo" (primario) en el pie, junto a "Para avanzar: …". A la izquierda, "Tus documentos" (una fila por documento con su etiqueta de estado, "Qué corregir: …" en rojo si lo rechazaron, la subida `inline` debajo para reemplazarlo ahí mismo y "Subir" secundario pequeño si falta) y el historial; a la derecha, en 22 rem, su lugar y "Lo que mandaste". El documento pendiente se lee "En revisión".
- **Alta asistida (`/solicitudes/nueva`):** el mismo asistente dentro del admin, bajo un encabezado "Alta asistida" con vuelta a Solicitudes. Los pasos hablan de la organización en tercera persona (La organización · Su lugar · Quién la representa · Documentos · Revisa y crea), sin contraseña, y el panel de pasos es una tarjeta blanca pegada a 96 px del borde superior. En "Revisa y crea", un switch en tarjeta "Cobrar el alta asistida" con la tarifa de Tarifas y la casilla de autorización. En el expediente, una etiqueta `outline` "Alta asistida por … · C$ …" (o "sin costo") y, para quien la llenó, un recuadro neutro "La llenaste tú": no revisa sus documentos ni la decide.
- **Lugar en borrador:** nombre en `body` 600 con "Borrador" en `outline`, una línea que dice que nadie lo ve todavía, la barra de avance de la ficha (6 px sobre papel, azul hasta la aprobación y verde después, con el porcentaje tabular en tinta) y "Completar la ficha" secundario pequeño.

### Pedidos y asignación de lugares
- **Solicitudes:** control segmentado bajo el encabezado, "Organizaciones nuevas · n" / "Lugares pedidos · n"; "Alta asistida" (primario) sólo en la primera vista. En Lugares pedidos, pestañas Por decidir / Decididos y una tabla con organización, lugar, nota y fecha. Por decidir: "Rechazar" `quiet` y "Aprobar" secundario pequeño por fila (el primario queda para el diálogo). Un lugar nuevo lleva bajo su nombre qué le falta para publicarse ("Antes de publicarlo le falta una foto…" en `caption` rojo) o "Tiene foto y ubicación" en verde; mientras le falte algo, el diálogo de aprobar lo explica en una caja crema y deja el primario deshabilitado. Decididos: etiqueta de estado, quién y cuándo, y la nota de la decisión; un lugar nuevo rechazado va en texto, sin enlace.
- **Agregar un lugar (organización):** diálogo con control segmentado "Ya está en la app" / "Es nuevo": lista de radios con miniatura de 40 px y buscador, o nombre, categoría y dirección; la nota es obligatoria para reclamar uno existente. "Tus pedidos" en un panel bajo la lista de lugares, con su estado.
- **Detalle de la organización:** en el panel Lugares, "Asignar lugar" secundario pequeño (organización activa) abre un diálogo con casillas de los lugares de su ciudad sin dueño y sin pedir; cada fila lleva "Sin foto" en papel si no tiene imagen, "Borrador" en `outline` y, salvo en borradores, un botón de quitar rojo de 44 px que pide confirmación para quitarlo.

### Circuitos
- **Lista:** oración de resumen (cuántos hay en la app por tipo, borradores), pestañas Todos · Especiales de K'Plan · Creativos · Privados, ciudad y buscador. Tabla con miniatura de 40 px, título corto y subtítulo; tipo como etiqueta: especial en `brand` con destellos, creativo en `badge` dorado con la alcaldía debajo, privado en `outline`; recorrido ("Granada · 4 paradas" y la duración); insignias con la medalla dorada y "+ N extra" en terracota profundo; cómo se hace ("En grupo · C$ 450"); estado (Publicado, En temporada con "Hasta el …", Borrador en papel, Temporada terminada en rojo). Los especiales van primero.
- **Editor:** página, no cajón. A la izquierda un panel con secciones separadas por reglas: el tipo en tres tarjetas de opción en fila (círculo de 36 px; el especial elegido en terracota, los demás en tinta), una caja de papel que avisa en español llano que la app todavía no conoce los especiales, datos, fotos, paradas, cómo se hace, recompensa, temporada (sólo especiales) y "Para el turista" con el mapa. A la derecha, pegados a 96 px, el interruptor "Publicado en la app" y el itinerario. Debajo del panel, en grupo, los horarios de grupo. Guarda la barra de tinta ("Crear circuito" / "Guardar cambios").
- **Paradas:** lista numerada con círculos de tinta de 28 px, miniatura, medalla si da insignia, horario, subir y bajar (el foco se queda en la fila movida) y quitar en rojo; desde la segunda, "Fijar el traslado" abre un campo de minutos ("Calcularlo" lo quita). Si cambia la parada anterior, el traslado fijo se borra y la fila lo dice. Debajo, las demás paradas de la ciudad con buscador y "+ Agregar".
- **Itinerario:** el mismo cálculo que la app. Selector de hora de salida (punto rojo en las que tienen avisos), "Saliendo a las …, termina a las …", el riel de paradas con horas tabulares y el traslado entre ellas (pie, vehículo, fijo); una parada que llega cerrada se pinta en rojo con el motivo. Caja roja al 5 % si alguna hora no se puede publicar. Pie con "Dura" y "Insignias" en `title` tabular, y la nota tal como la lee la app.
- **Mapa del recorrido:** paradas numeradas en tinta con borde blanco, ruta punteada de tinta al 55 %, el punto de encuentro terracota arrastrable encima; se enfoca con teclado (Enter lo pone en el centro, flechas lo mueven) y "Usar la parada 1" lo pone en la primera.
- **Horarios de grupo:** filas con el día y la hora, inscritos sobre una barra de 6 px (azul, verde si está lleno) y, a la derecha, el guía, "Con transporte" y su nota completa.
- **Grupos de opciones en un Field:** con `group`, la etiqueta nombra al SegmentedControl por id y su ayuda y su error se anuncian con él; con error, el borde va en rojo al 60 %.

### Subida de documentos
`DocumentUpload` sube un documento con una ranura por cara o página: la cédula pide Frente y Reverso, lado a lado desde `sm`; los demás, una sola ("Archivo"). Acepta JPG, PNG, WebP o PDF.
- **Tarjeta:** blanca, 16 px de relleno, borde `divider` (rojo al 60 % si tiene error, con el mensaje en `caption` 500 rojo al pie). Mosaico de 40 px en papel con el ícono de credencial o de documento, el nombre en `body` 600 con "Opcional · si…" en `caption` `hint` si no es obligatorio, y el emisor en `small` `muted`. La variante `inline` deja sólo las ranuras, para una fila que ya nombra el documento.
- **Ranura vacía:** zona de al menos 64 px con borde punteado arena y 10 px de radio: ícono de subida y "**Subir frente** o arrástralo aquí" en `small` (la acción en tinta 600, el resto `muted`). Hover con borde de tinta al 50 %; al arrastrar un archivo encima, borde de tinta y fondo `paper`. Mientras sube, un spinner en lugar del ícono; si falla, el error debajo en rojo.
- **Ranura con archivo:** fila con fondo crema al 60 %, borde `divider` y 8 px de relleno: miniatura de 48 px con 6 px de radio (o un mosaico "PDF" en papel), la cara en `small` 600 y el nombre del archivo en `caption` `muted` recortado, y dos botones de ícono de 44 px: cambiar (en tinta) y quitar (en `danger`).

### Agenda de la semana
La pieza que define el portal: una tabla con `role="grid"` de siete columnas de día y filas de una hora, agrupadas por fase (Mañana, Mediodía, Tarde, Noche) con la fase escrita en vertical en una canaleta pegajosa.
- **Cabecera del día:** número en círculo de 32 px (tinta con texto crema si está elegido), día corto en `label` (terracota profundo "HOY" para hoy), y total de personas con ícono. La columna de hoy lleva raya superior terracota de 3 px.
- **Franjas encima de los días:** campañas como barras doradas de 28 px que cruzan los días que cubren; eventos como tarjetitas crema con borde de tinta al 15 %.
- **Celdas:** 44 px, teñidas de azul en cinco escalones según la gente esperada; el número en `figure` (blanco sobre el azul pleno). En horas pasadas, la ficha de confirmados abajo a la derecha: verde con palomita y número, o neutra en cero.
- **Ahora:** una línea terracota de 2 px con punto de 8 px cruza la celda a la altura del minuto actual, por detrás del número.
- **Interacción:** elegir una celda filtra el panel del día a quien está presente en esa hora; las flechas recorren la cuadrícula, Inicio y Fin saltan a la primera y última hora, Escape vuelve al día completo. Elegida con anillo interior de 2 px en tinta.
- **Panel del día:** tarjeta pegajosa a la derecha con el día, una línea de totales, y la lista de grupos (hora de llegada y salida tabulares, personas, circuito, etiqueta de estado).
- **Vistas hermanas:** `DayTimeline` (barras azules con relleno verde de confirmados) y `MonthCalendar` (días teñidos de azul, hoy en círculo de acción terracota, raya dorada si hay campaña) con el mismo panel.

### Vista previa del teléfono
`AppPreview` dibuja la ficha del lugar tal como la ve el turista, dentro de un marco de tinta de 2.6 rem de radio con `shadow-pop`. Adentro copia la pantalla de parada de la app, incluidos su botón terracota de acción accesible, sus chips de categoría, la estrella y sus tamaños de texto reducidos (9–12 px). Es una réplica de la app, no un patrón del portal: sus tamaños no se reutilizan fuera de ella; el botón utiliza action/on-action como el portal.

### Reglas consolidadas de marca · 29/09/2026

La [auditoría](auditoria-marca.md) precisa estas reglas sobre las descripciones históricas anteriores:

- El símbolo es el pin con la máscara del caballo del Güegüense. El maestro local de imagotipo es `DiseñoMarca/Logos/SVGs/Imagotipos/ImagotipoFinalVersion.svg`.
- Logo lateral de 36 px dentro de cabecera de 72 px: 18 px de protección vertical. Al contraer, el símbolo de 32 px aparece en el enlace existente de la topbar; no se modifica su destino.
- Iconos de navegación y acciones principales: 20 px, trazo 2, objetivo ≥44 px. Metadatos y vistas previas conservan escalas compactas documentadas.
- Cabecera móvil con padding de 12 px y gaps de 4 px, recuperando la separación de escritorio desde `sm`.
- Chips de la miniatura: `action` con blanco; ciudad y naturaleza con carbón; cultura con blanco. Mantienen la categoría y superan 4,5:1. La miniatura es referencia visual, no certificación de la app publicada.

La [bitácora](bitacora.md) registra los cambios y [el cierre](cierre.md) reúne las pruebas y limitaciones.
