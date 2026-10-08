---
icon: lucide/git-branch
---

# Especificación de migración visual

Fuente: `DESIGN_SYSTEM.md` v1.0. La personalidad visual sigue siendo cultural, cálida y clara; la interfaz prioriza agenda, edición y revisión. Poppins, crema y carbón se mantienen. La composición distingue mejor navegación, controles y contenido.

## Tokens y reglas

| Elemento | Antes | Decisión | Razón |
| --- | --- | --- | --- |
| Marca | `#D95D39` también en botón | Conservar como `brand`; separar `action` = `#B74728`, hover = `#983A20` | Blanco sobre marca 3,77:1; sobre acción 5,32:1. |
| Foco | Carbón 2 px/offset 2; campos sin outline | Acción 2 px/offset 5; inset donde un contenedor desplaza/recorta | Foco perceptible y consistente con la marca. |
| Campo | 40 px, contorno arena | 48 px, contorno funcional `#858E8B`, relleno blanco | Diferenciar campo de panel y mejorar activación. |
| Botón | 32/40/48 px; mayúsculas | 44/48/52 px; texto original sin transformación a mayúsculas | Jerarquía de tamaños y lectura natural; se conserva el copy. |
| Icon button | 32/40 px | 44/48 px | El icono conserva tamaño; crece su área de interacción. |
| Segmentos y opciones | 28/32 px | 44 px mínimo; opciones pueden envolver en móvil | Mismo selector, sin pérdida de controles en ancho estrecho. |
| Panel/tabla | Radio de 10 px general | Radio de panel de 12 px; controles de 10 px; tags de 6 px | Jerarquía geométrica del sistema global. |
| Navegación | Papel arena; filas 36/40 px | Superficie blanca, selección carbón; filas 44 px | Separar navegación del lienzo y ampliar área de activación. |
| Topbar | Mismo crema del lienzo | Superficie blanca, borde suave | Encabezado estable y reconocible. |
| Tabla | Encabezado blanco en mayúsculas | Encabezado crema tenue, texto original, filas con foco/hover | Mejor lectura de datos sin cambiar densidad ni columnas. |
| Prosa de resumen | Bloques de hasta 84 caracteres | 72 caracteres y jerarquía de contexto | Lectura cómoda sin tocar los datos ni redactarlos de nuevo. |
| Revisión | Etapas de 28 px y varias cajas equivalentes | Marcadores de 32 px, separación y superficie consistentes | Distinguir etapa, evidencia y acción conservando su significado. |

Los colores de mapa, categorías, medallas y estados operativos mantienen su significado y valores. El amarillo de recompensa global no reemplaza indiscriminadamente el oro de una medalla. `planned` sigue siendo `#2F6690`; no se sustituye por azul de marca. La ilustración original de acceso se conserva.

## Patrones por familia

- **Negocio:** agenda legible y controles cómodos; lugares como lista con imagen, estado y completitud; editor y vista previa conservan la correspondencia con la app.
- **Alcaldía:** la misma gramática visual con filtros y listados que permiten comparar varios lugares. No se agregan capacidades de negocio a este rol.
- **Equipo:** cabeceras, pestañas, filtros y tablas consistentes; documentos y decisiones con jerarquía separada. El color no sustituye la etapa textual ni una confirmación.
- **Entrada:** columna de acceso con respiración y campos claramente identificables; postulación con foco en el formulario y una columna secundaria de ayuda.

## Excepciones deliberadas

La vista previa del teléfono utiliza texto pequeño porque representa una miniatura del producto, no controles operables. Agenda y tablas conservan desplazamiento horizontal interno cuando comparar columnas necesita más ancho. Los enlaces dentro de una frase conservan su tamaño de texto; los controles independientes cumplen el objetivo de activación. No se introduce tema oscuro, Inknut en pantallas operativas ni redacción nueva.

## Cierre de marca · 29/09/2026

- Imagotipo lateral: 36 px de alto, cabecera 72 px y 18 px libres arriba/abajo. El símbolo de la topbar permanece visible cuando el lateral se contrae; se reutiliza el enlace existente mediante CSS.
- Navegación y acciones principales: Lucide a 20 px, trazo efectivo 2; objetivos de al menos 44 px. Se permiten 12–16 px para metadatos, indicadores y la miniatura de la app. Los dibujos rellenos de estrellas conservan su significado.
- Cabecera móvil: padding 12 px y gap 4 px; separación amplia desde `sm`. El modo demo y la validación de cupón permanecen visibles.
- Panel de día: título y filtro por hora permiten envoltura; intervalo, conteo y acción mantienen legibilidad en 320 px.
- Chips de la miniatura: terracota de acción/blanco, ciudad/carbón, naturaleza/carbón, cultura/blanco. Contrastes respectivos: 5,32 / 4,63 / 4,82 / 5,25:1. Se conservan categorías, datos y función de asignación de color.
- El símbolo representa el pin y la máscara del caballo del Güegüense. Los comentarios apuntan al maestro de `DiseñoMarca/Logos/SVGs/Imagotipos/`.

Véanse [auditoría](auditoria-marca.md), [evidencias](evidencias.md) y [verificación final](cierre.md).
