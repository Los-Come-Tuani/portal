# Auditoría de marca y cierre visual · K’plan

**Fecha:** 29 de septiembre de 2026, America/Managua.  
**Superficie:** portal de negocios, alcaldías y equipo interno.  
**Método:** `skill-selector` → `impeccable audit`, registro de producto; contraste con el manual y comprobación en navegador.  
**Alcance:** presentación. Los datos usados en las capturas son de demostración.

## 1. Dictamen

**El portal está arraigado en la marca K’plan y tiene una adaptación operativa coherente.** Utiliza los trazados originales del imagotipo, Poppins, carbón, crema, terracota y una ilustración territorial reconocible. La navegación sobria, las tablas y la densidad responden al trabajo de organizaciones. El uso de Lucide y la ausencia de Inknut en tablas son adaptaciones justificadas.

Las desviaciones detectadas se concentran en la presentación del logo, la escala de iconos principales, algunos contrastes de la miniatura móvil y el ajuste de la cabecera estrecha. La fotografía demo no permite certificar autenticidad territorial. El documento distingue estas correcciones de las oportunidades editoriales opcionales.

**Prueba de patrones visuales de `impeccable`: favorable.** Se observa un lenguaje estable de superficies, controles y estados, sin gradientes decorativos, tipografía expresiva en formularios ni animación ornamental. Las tarjetas agrupan tareas reales; el calendario conserva su densidad. No se penaliza la familiaridad de una interfaz de trabajo.

## 2. Fuentes y autoridad

| Fuente | Evidencia utilizada | Aplicación |
| --- | --- | --- |
| [Manual Figma, página 42:183](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=42-183) | Acceso confirmado; estructura de 35 láminas, panorama y capturas de detalle | Identidad y recursos originales |
| [Construcción del símbolo, 45:2899](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=45-2899) | Pin + máscara del caballo del Güegüense | Interpretación correcta del símbolo |
| [Protección, 45:2977](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=45-2977) | Módulo proporcional de medio símbolo | Espacio libre del imagotipo |
| [Paleta, 45:3050](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=45-3050) | Carbón, crema, terracota, verde, amarillo y azul | Primitivos de marca |
| [Tipografía, 46:3166](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=46-3166) | Inknut Antiqua y Poppins | Expresión editorial y lectura |
| [Usos correctos, 91:1028](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=91-1028) | Variantes oscuras/claras y fondos corporativos | Logo sin deformación ni recoloración arbitraria |
| [Tono, 283:32](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=283-32) | Cercano, curioso, claro, respetuoso y activo | Orientación contextual, sin burocracia |
| [Stickers, 102:1437](https://www.figma.com/design/H5vHmRvzeBZfYzsFHj8Cjm/Manual?node-id=102-1437) | Caballo, maracas, iglesia, volcán, cacao, guitarra y otros motivos | Repertorio expresivo; no es un kit de iconos funcionales |
| [Sistema transversal](../../../../DESIGN_SYSTEM.md) | Tokens y excepciones operativas, §§4–8 | Fuente normativa del portal |
| [Landing](../../../../LandingPage/DESIGN.md) | Poppins operativa, Inknut en momentos expresivos, fotografía local | Continuidad entre superficies |
| [Mockups móviles](../../../../wireframesApp/) y [entrega de flujos](../../../../figma-flujos-v1/DELIVERY.md) | Crema, terracota, Poppins, componentes y estados | Continuidad del producto; no copiar navegación móvil a escritorio |
| [Maestro SVG](../../../../DiseñoMarca/Logos/SVGs/Imagotipos/ImagotipoFinalVersion.svg) | Ocho trazados coinciden literalmente con `Logo.tsx`; viewBox 537 × 223 | Autenticidad del logo |

La numeración de láminas del Figma actual difiere de algunas referencias del PDF antiguo. Se citan nodos estables. El HEX del crema es `#F8F4E6`; la errata RGB del manual no constituye una variante de color. Los documentos sirven como fuentes, no como autorización para alterar funciones.

## 3. Contexto, distribución y muestra

El portal es una aplicación React con rutas diferidas, carcasa compartida y componentes de interfaz en `src/components/ui`. Los perfiles y permisos deciden la navegación existente. La auditoría conserva esa distribución:

| Familia | Muestra recorrida |
| --- | --- |
| Público | Acceso y postulación |
| Negocio | Agenda, lugares, editor de lugar, cupones, eventos, insignias y pagos |
| Alcaldía | Agenda multisitio, lugares, editor, eventos, insignias y pagos |
| Equipo | Agenda, contenido, solicitudes y alta asistida, detalle de admisión, organizaciones y detalle, guías y detalle, circuitos y editor/nuevo, usuarios, equipo, roles, cobros y tarifas |
| Organización pendiente | Solicitud, lugares y editor |

La matriz principal contiene **39 combinaciones de perfil/ruta × 6 anchos = 234 mediciones**: 320, 360, 390, 768, 1024 y 1440 CSS px. Las imágenes principales son de 390 y 1440 px; las anomalías estrechas tienen capturas adicionales. Se espera la carga de contenido y fuentes; se registran ausencia de esqueletos, tamaño de controles y errores de ejecución.

Los estados complementarios cubren menú contraído, drawer, foco, error de acceso, error de lugar, vacío por filtro y diálogo de cupón. Los recorridos de cierre añaden revisión documental, hoja de roles, teclado de agenda/tabla, perfil de revisión limitado y reflujo equivalente a 200 %. No se guardan formularios ni decisiones.

## 4. Matriz de fidelidad

| Elemento | Clasificación | Observación y decisión |
| --- | --- | --- |
| Trazados y proporción del logo | Alineado | 8/8 trazados del maestro; color carbón; proporción conservada |
| Protección y presencia del logo | Desviación corregida | Más espacio vertical y símbolo visible al contraer el lateral, H01–H02 |
| Favicon | Alineado en archivo; reducción parcial | Símbolo sobre crema. No se certifica aquí legibilidad de la pestaña nativa a 16 px |
| Carbón/crema/terracota | Alineado | Identidad conservada en tokens semánticos |
| Terracota de acción más oscuro | Adaptación justificada | `#B74728` con blanco alcanza 5,32:1; no reemplaza el primitivo de marca |
| Azul de agenda y oro de medalla | Adaptación justificada | Estados operativos `#2F6690` y `#E0B84C`; no confundir con azul/amarillo corporativos |
| Poppins en trabajo | Adaptación justificada | Escala estable en formularios, tablas y navegación; Inknut no es obligatoria en estas superficies |
| Lucide | Adaptación justificada con escala corregida | Familia lineal consistente; H03 distingue controles principales de metadatos |
| Ilustración del acceso | Alineado | Cerámica, arquitectura y paisaje sobre crema; imagen decorativa con alt vacío |
| Patrones y stickers | Oportunidad selectiva | Disponibles en el manual y repositorio; su ausencia en tablas no es incumplimiento |
| Fotos de lugares | No verificable como marca | Picsum y datos demo; no representan un catálogo territorial validado |
| Tono | Alineado en la muestra | “Tu lugar en la app”, “Qué pasa después”, “Reintentar”; verbos y contexto claros |
| Miniatura de la app | Adaptación con corrección de contraste | Tipografía menor por ser vista previa; categorías mantienen significado y datos, H05 |

## 5. Hallazgos y correcciones

Prioridades: P0 bloquea una tarea; P1 dificulta significativamente o incumple contraste AA; P2 afecta consistencia o uso con alternativa; P3 es refinamiento opcional. Se identificaron **6 correcciones concretas: 0 P0, 1 P1 y 5 P2**. Las oportunidades del §7 no se suman como fallos obligatorios.

### H01 · P2 · Espacio de protección del imagotipo

- **Ubicación:** `src/app/layout/Sidebar.tsx`, cabecera de `SidebarContent`.
- **Antes:** logo de 36 px en cabecera de 64 px: 14 px libres arriba y abajo. El módulo de medio símbolo implica 18 px para este tamaño.
- **Impacto:** identidad demasiado próxima al borde superior; la carcasa no sigue completamente la protección del manual.
- **Corrección:** cabecera de 72 px, logo sin modificar y control de contracción recentrado.
- **Aceptación:** 36 px de alto y 18 px libres verticales, proporción 537:223. Confirmado en la medición final.
- **Ruta recomendada/aplicada:** `impeccable layout` como criterio → `frontend-ui-engineering` para clases; revisión visual.

### H02 · P2 · La marca desaparecía con el lateral contraído

- **Ubicación:** `Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx` y `base.css`.
- **Antes:** el imagotipo lateral se ocultaba y el símbolo de la topbar era exclusivo de móvil. La vista contraída no conservaba una señal gráfica de K’plan.
- **Corrección:** mostrar el enlace de marca ya existente de la topbar cuando el control del lateral expone `aria-expanded=false`. CSS responde al estado existente.
- **Aceptación:** símbolo visible al contraer, sin duplicarlo en escritorio expandido; mismos handlers, ruta de inicio y controles. La captura final lo confirma.
- **Ruta:** `impeccable adapt` → `frontend-ui-engineering`.

### H03 · P2 · Escala de iconos principales dispersa

- **Ubicación:** `Sidebar.tsx`, `components/ui/styles.ts`, `IconButton.tsx`.
- **Antes:** navegación de 18 px y trazo 1,75; acciones frecuentes de 16 px; otras medidas locales. El inventario de atributos no equivale a un recuento de controles visibles.
- **Corrección:** dibujo principal de 20 px y trazo 2 mediante clases; el área activa sigue siendo ≥44 px. Se conserva Lucide y su significado.
- **Excepciones:** flechas/metadatos compactos de 12–16 px, estrellas, estado de calendario y miniatura móvil. No se agrandan indiscriminadamente.
- **Aceptación:** navegación y botones principales a 20 px/2, alineados y sin comprimir etiquetas; medición CSS efectiva, no solo el atributo SVG.
- **Ruta:** `impeccable polish` → `frontend-ui-engineering`.

### H04 · P2 · Cabecera estrecha de negocio

- **Ubicación:** `src/app/layout/Topbar.tsx`.
- **Antes:** varias pantallas de negocio medían 334 px de documento con viewport de 320 px. Menú, logo, aviso demo y validación competían por ancho.
- **Corrección:** padding de 12 px y gaps de 4 px en móvil; los espacios de escritorio se conservan. Ningún control se elimina ni pierde etiqueta accesible.
- **Aceptación:** scroll del documento igual al ancho en la cabecera de 320/360/390 px; todos los controles siguen visibles y operables. Las tablas y agenda pueden desplazar internamente.
- **Ruta:** `impeccable adapt` → `frontend-ui-engineering`.

### H05 · P1 · Texto blanco de categorías en la miniatura

- **Ubicación:** `src/features/places/components/AppPreview.tsx`, chip de categoría.
- **Antes:** blanco sobre terracota original = 3,77:1; también se debe ajustar la tinta sobre categorías ciudad/naturaleza. Son etiquetas de texto pequeño.
- **Corrección:** terracota funcional para el chip terracota, carbón en ciudad/naturaleza y blanco en cultura. Se conserva la asignación de categoría, contenido y paleta original de categorías.
- **Aceptación:** cada combinación de texto/fondo ≥4,5:1, sin cambiar `chipColor`, datos o lógica condicional. Valores comprobados en el registro final de contraste.
- **Norma:** [WCAG, contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). La excepción para logotipos no exime a estas etiquetas.
- **Ruta:** `impeccable colorize` → `frontend-ui-engineering`.

### H06 · P2 · Referencia conceptual del símbolo incorrecta

- **Ubicación:** comentarios de `src/components/brand/Logo.tsx`; referencias históricas de documentación.
- **Antes:** los comentarios llamaban “león” al símbolo y remitían a una carpeta móvil ausente. Los trazados eran correctos.
- **Corrección:** comentarios identifican la máscara del caballo del Güegüense y el maestro SVG local. Se preservan constantes, exports y trazados.
- **Aceptación:** futura edición remite al activo correcto; comparación de trazados sin cambios. El sistema global contiene una observación histórica de botones de 40 px que ya no describe el portal actual; manda la especificación operativa actualizada.
- **Ruta:** `impeccable document`; documentación de diseño y comentarios, sin refactor.

## 6. Auditoría técnica de `impeccable`

La puntuación es una valoración de la muestra y del código revisado, no certificación WCAG ni prueba de rendimiento en producción.

| Dimensión | Después | Evidencia y límite |
| --- | ---: | --- |
| Accesibilidad | 3/4 | Contraste de controles principales, foco visible, etiquetas, errores y diálogo comprobados; no hubo sesión con lector de pantalla nativo |
| Rendimiento | 3/4 | Rutas diferidas y estados de carga; SVG de acceso de 406.657 bytes y chunk de mapa de ~1,04 MB sin comprimir. No se midieron Core Web Vitals |
| Responsive | 3/4 | Matriz de seis anchos y verificaciones dirigidas; tablas conservan scroll local. El ensayo de 200 % es equivalente de viewport, no zoom nativo del navegador |
| Theming | 3/4 | Tokens semánticos y excepciones documentadas; solo se ofrece el tema claro actual |
| Patrones visuales | 4/4 | Registro de producto consistente; recursos culturales en contexto, tareas y jerarquía claras |
| **Total** | **16/20 · Bueno** | El plan inicial partía de 13/20 provisional. Las reservas actuales se explicitan arriba |

Contrastes sRGB: blanco/acción **5,32:1**, blanco/hover **7,09:1**, carbón/crema **14,84:1**, texto secundario/crema **6,07:1**, contorno de campo/blanco **3,37:1**, contorno/crema **3,06:1**. El objetivo de 44 × 44 px es del design system y coincide con el [criterio reforzado de tamaño de objetivo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html); no se presenta como el mínimo universal AA.

**Aspectos positivos que preservar:** identidad vectorial auténtica; separación entre marca y acción; estados con texto además de color; Poppins cargada localmente; navegación por perfil; foco y cierre de diálogo; movimiento reducido; superficies cálidas con contraste funcional; ausencia de ornamentación sobre tablas.

## 7. Oportunidades y dependencias fuera de las correcciones

| Tema | Prioridad | Decisión y aceptación futura |
| --- | --- | --- |
| Fotografía territorial | Dependencia de contenido antes de publicar un catálogo real | Validar autoría, permiso, lugar y recorte con fotos reales. Los mocks permanecen intactos por instrucción del usuario |
| Patrones/stickers | P3 opcional | Considerar un sello o ilustración original en orientación inicial; no aplicarlos detrás de tablas o formularios. La lámina de stickers fue visible como imagen; no se confirmó cada vector individual |
| Inknut en bienvenida | P3 opcional | Solo tendría sentido en una frase editorial del acceso. Poppins actual ya está autorizada por el sistema operativo; no se impone una segunda fuente |
| Rendimiento de recursos | P3, pendiente de medición de producción | Medir descarga/LCP antes de intervenir el SVG o el mapa. División de código o sustitución de biblioteca queda fuera del rediseño visual |
| Catálogo móvil publicado | Dependencia de otro producto | La miniatura reproduce convenciones de los mockups; no certifica que la app publicada tenga idénticos estados/contrastes |

## 8. Segunda etapa ejecutada y trazabilidad

La solicitud posterior de terminar los arreglos autorizó aplicar H01–H06. Véanse la [bitácora](CHANGELOG.md), la [especificación](MIGRATION.md), la [galería y cobertura](EVIDENCIAS.md) y el [cierre de verificación](CIERRE.md). La auditoría previa se conserva en `output/playwright/brand-audit`; las evidencias posteriores se guardan en `brand-final`.

Correspondencia de los hallazgos con comandos recomendados: `impeccable adapt` para ancho/presencia → `impeccable layout` para protección → `impeccable colorize` para contraste → `impeccable document` para trazabilidad → **`impeccable polish`** para escala/alineación. La implementación realizada usa `frontend-ui-engineering`; la evaluación usa `impeccable audit` y su registro de producto. Los otros nombres son recomendaciones de enrutamiento, no invocaciones adicionales ejecutadas.

Se puede abordar cualquiera de las oportunidades por separado. Una nueva corrección debe cerrar con revisión visual y repetir la auditoría sobre las superficies afectadas.
