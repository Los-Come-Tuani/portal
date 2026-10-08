---
icon: lucide/check-check
---

# Cierre del rediseño visual · K'Plan

**Fecha:** 29/09/2026. **Resultado:** implementación visual completada con las limitaciones de verificación que se detallan abajo.

El plan `plans/002-redisenio-visual-portal-kplan.md` se resuelve en fundamentos, navegación, negocio/alcaldía, equipo y cierre. La [auditoría de marca](auditoria-marca.md) añade comprobación directa del manual Figma y las correcciones H01–H06. La [bitácora](bitacora.md) documenta cada lote; la [galería](evidencias.md) permite revisar las pantallas.

## Requisitos y pruebas

| Requisito | Evidencia actual | Resultado |
| --- | --- | --- |
| Conservar arquitectura, lógica y mocks | `integrity.json`: hashes de 132 archivos protegidos; AST de los TS/TSX cambiados comparado con commit basal `ae0c5d4` | Conforme. Solo se excluyen comentarios y cadenas de estilos al comparar; condiciones, callbacks, texto, atributos y estructura funcional se conservan |
| Preservar trabajo preexistente | Manifiesto de 289 archivos antes de auditoría y `changes-since-audit.json` | Conservados `pnpm-lock.yaml` y espacios finales de `index.html`; sin reset ni checkout destructivo |
| Identidad y componentes | Maestro SVG 8/8 trazados, paleta, Poppins, radios, acción/foco/campos y módulos por familia | Conforme a la adaptación operativa; excepciones en [la especificación de migración](migracion.md) |
| Logo e iconos | `final-checks.json`, matriz y captura contraída | Protección vertical 18 px; símbolo contraído visible; iconos principales 20 px/trazo 2 |
| Contraste | `brand-audit/static.json` y `brand-final/final-checks.json` | Acción 5,32:1; hover 7,09:1; cuatro chips entre 4,63 y 5,32:1 |
| Responsive por perfil | 234 mediciones, 39 combinaciones de perfil/ruta, seis anchos; repetición dirigida de agenda | Sin desbordamiento persistente de documento en las vistas verificadas; scroll local conservado para tablas/calendario |
| Estados | Error de acceso/postulación/lugar, vacío por filtro, carga, cupón, drawer, hoja de rol y documentos | Capturados en `brand-final`; se conservan los mecanismos existentes |
| Teclado | `keyboard.json` | Foco visible; selector día/semana/mes; columna 287,84→303,84→287,84 px; Escape y retorno al disparador de cupón |
| Rol y permisos | Captura de Daniela Jarquín y comparación de archivos protegidos | Navegación restringida conserva sus entradas; no aparecen cobros/tarifas/roles en la muestra |
| Movimiento reducido y escala | `interactions.json`, muestra 720 × 480 CSS px/DPR 2 | Sin desbordamiento, `prefers-reduced-motion` activo y transiciones reducidas |
| Puertas técnicas | Logs `typecheck-final`, `lint-final`, `test-final`, `build-final`; `brand-final/gates.json` | Tipos, lint, 7 archivos/36 pruebas y build aprobados |
| Documentación | [Diseño](index.md), [la especificación de migración](migracion.md), [la bitácora](bitacora.md), auditoría, galería y este cierre | Decisiones, razones, fuentes y evidencias registradas |

## Interpretación de las comprobaciones

- La matriz bruta conservó una medición de 338 px en agenda tras cambiar a 320 px. Dos recorridos dirigidos posteriores, uno desde contexto de 320 y otro repitiendo los seis anchos, dan 320/320 y ningún elemento fuera del documento. Se conserva el registro original: no se reemplaza silenciosamente por un resultado favorable.
- El primer script de interacción consultaba `aria-checked`/`aria-valuenow` inmediatamente. La repetición espera el estado seleccionado y mide el ancho renderizado; comprueba el cambio y su restablecimiento. Ambos archivos se conservan.
- En el diálogo nativo, al tabular desde el último control Chromium puede llevar el foco a la interfaz del navegador; `activeElement` se registra entonces como `BODY`. No se observó foco en controles de la página de fondo. No se afirma un ciclo JavaScript de foco cerrado: se conserva la semántica modal nativa y se verifican Escape/retorno.
- La métrica `visibleLogos` del script general filtra `svg[role=img]`; el símbolo aislado existente no entra en ese selector. Para el estado contraído manda la medición específica de `.kplan-topbar-brand` (44 px, símbolo de 32 px) y su captura.
- La miniatura y las estrellas contienen dibujos pequeños no interactivos. Los contadores de tamaño de botón excluyen controles nativos de MapLibre y elementos deshabilitados; no prueban por sí solos conformidad de todos los enlaces o controles de terceros.

## Límites explícitos

1. La revisión de accesibilidad usa DOM, árbol accesible y teclado de Chromium. No se ejecutó una sesión de NVDA/VoiceOver; no se emite certificación WCAG completa.
2. Se comprobó reflujo equivalente a 200 % mediante viewport 720 × 480 y DPR 2, no el zoom nativo de la interfaz del navegador. Tampoco se validaron todos los navegadores/dispositivos físicos.
3. El mapa depende de recursos externos; algunas capturas pueden no mostrar teselas. La compilación conserva un chunk de mapa de aproximadamente 1,04 MB sin comprimir. Optimizar arquitectura o dependencias queda fuera del alcance visual.
4. Las fotos de Picsum y documentos de demostración siguen siendo mocks. La autenticidad editorial del catálogo requiere contenido real y autorización independiente para cambiarlo.
5. No se guardaron formularios, roles, cobros ni decisiones. La conservación de resultados funcionales se respalda principalmente en hashes y equivalencia estructural, más los recorridos de lectura.

Estos límites no se presentan como correcciones implementadas. Las oportunidades de Inknut editorial, stickers, fotografía real y optimización se mantienen separadas del cierre visual aprobado.

## Reproducibilidad

Los scripts de navegador están en `output/playwright/brand-final/*.pw`; usan la instancia local en el puerto 5177 y contextos demo aislados. `report.cjs` genera la galería y resumen, y `verify-integrity.cjs` compara contra la línea base. Los JSON de salida de la CLI contienen un campo `result` con el JSON serializado del recorrido.

La puntuación final es **16/20** en la muestra de `impeccable audit`, frente al **13/20 provisional** del plan inicial. Toda modificación posterior debe documentar su lote y repetir las comprobaciones relacionadas.
