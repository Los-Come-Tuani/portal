# Bitácora de reestructuración visual

## VIS-000 · 28/09/2026 · Línea base y especificación

**Fases:** 0–1, en curso. **Pantallas:** entrada, postulación, negocio, alcaldía, equipo y organización pendiente.

**Selección de skills:** `skill-selector` clasifica la fase 0 como auditoría de web UI existente → `impeccable audit`, solo lectura. Para la fase 1, dirección ya fijada por la marca → `impeccable` con registro de producto; no se requiere investigación de paletas. `playwright` registra los estados reales mediante cuentas demo.

**Cambio documental:** se crean este índice, especificación y hashes de 282 archivos; se guardan capturas por rol y ancho en `output/playwright/before/`. No hay cambios de producto en esta entrada.

**Decisión:** separar acción de marca, dar contraste a los campos, ampliar objetivos, clarificar encabezados y superficies, y adaptar filtros en móvil. Véase `MIGRATION.md` para valores y motivos. La lógica, los mocks y la estructura de módulos quedan congelados mediante hashes.

**Verificación:** el estado Git inicial solo contenía `pnpm-lock.yaml` sin seguimiento. El manifiesto incluye ese archivo para comprobar que se conserva. La matriz de captura y los resultados de auditoría se completan antes de cerrar el trabajo.

## VIS-001 · 28/09/2026 · Fundamentos y componentes

**Fase:** 2. **Selección:** `skill-selector` → `frontend-ui-engineering` para presentación React/Tailwind; `impeccable` revisa las imágenes con registro de producto.

**Archivos:** `src/styles/{theme,base}.css`; `src/components/ui/{styles,Input,IconButton,Panel,PageHeader,Choice,Tabs,Table,Dialog,Menu,Toast,SaveBar,States}`.

**Antes → después:** acción terracota separada de marca; foco 2 px/offset 5; campos de 48 px con borde funcional; botones 44/48/52 px; icon buttons 44/48; segmentos 44; paneles de 12 px; tabla con cabecera crema y texto sin transformación; paneles, tablas y campos limitan ancho; errores/vacíos tienen superficie definida. Se preservan eventos, condiciones, atributos y textos. Las dimensiones del switch crecen sin cambiar su pista visual ni su evento.

**Motivo:** contraste, lectura y activación; adopción de `DESIGN_SYSTEM.md` §§4–5. La revisión de la primera captura detectó que segmentos iguales comprimían “Semana”; se corrigió a ancho por contenido y envoltura.

**Evidencia:** `output/playwright/phase-2-components.png` y matriz basal de 81 capturas autenticadas, más 10 públicas. **Pruebas:** typecheck, lint, 36 tests y build pasaron; los scripts de captura se movieron a extensión `.pw` para no ser analizados como código de producto por lint. La comparación final cubre todos sus consumidores.

## VIS-002 · 28/09/2026 · Entrada y navegación

**Fase:** 3. **Selección:** `skill-selector` → `frontend-ui-engineering`, implementación de presentación; revisión visual con registro de producto de `impeccable`.

**Archivos:** `src/app/layout/{AppShell,Sidebar,Topbar,DemoMenu}.tsx`, `src/features/auth/LoginPage.tsx`, `src/features/onboarding/components/ApplicationWizard.tsx`.

**Antes → después:** navegación y topbar blancas sobre lienzo crema; enlaces laterales de 44 px; cabecera de 72 px; contenedor principal con ancho mínimo 0; columna de acceso blanca en escritorio, ilustración original sobre crema; ayuda de postulación diferenciada; enlaces de alta se envuelven en móvil. El flyout contraído tiene límite de altura y scroll, conservando el cálculo de posición existente.

**Evidencia:** `phase-3-{shell,collapsed,drawer}.png`; 10 capturas públicas finales en `output/playwright/after/`. `shell-check.json` confirma contraer/expandir, abrir menú móvil y cerrar con Escape.

**Pruebas:** lint sin advertencias, 36 tests y build pasan. `integrity.json` confirma que los 132 archivos congelados siguen idénticos y los TS/TSX tocados solo difieren en cadenas de clases.

## VIS-003 · 29/09/2026 · Negocios y alcaldías

**Fase:** 4. **Selección iterativa:** `skill-selector` → `frontend-ui-engineering`, adaptación de componentes existentes; `impeccable` aporta criterio de jerarquía y lectura.

**Archivos:** `Field.tsx`; `arrivals/Agenda.tsx` y `{AgendaToolbar,AgendaSummary,DayPanel,WeekGrid,MonthCalendar}.tsx`; `places/{PlacesPage,PlaceEditorPage}.tsx` y `{StopForm,ImageListField,AppPreview}.tsx`.

**Antes → después:** barra de agenda adaptable, resumen de 72 caracteres, calendario y panel de día con radios coherentes; listas de lugares con imagen visible también en móvil y completitud en su propia fila; formularios y grillas con ancho mínimo 0; fotos y sus botones caben en la columna. La miniatura de la app adopta contraste de acción sin cambiar su contenido. Eventos, cupones, insignias y pagos reciben las mejoras de componentes compartidos.

**Evidencia:** `layout-phase4.json` confirma que agenda, solicitudes, cobros y circuito nuevo ya no ensanchan la página a 390 px. `overflow-details.json` localizó la grilla de fotos y la matriz de roles. La grilla de fotos se corrigió con columnas de mínimo cero; roles corresponde al siguiente lote. Se completa la matriz visual final después de ambas correcciones.

**Pruebas:** typecheck, lint y 36 tests pasan. Compilación del lote registrada en `build-phase4.log`. No se guardan formularios ni se cambian fixtures durante el recorrido.

## VIS-004 · 29/09/2026 · Equipo interno y formularios largos

**Fase:** 5. **Selección:** `skill-selector` → `frontend-ui-engineering`, presentación de React/Tailwind; `impeccable audit` verifica el conjunto. Esta entrada completa la trazabilidad de los ajustes que ya estaban presentes en el árbol de trabajo al comenzar el cierre.

**Archivos:** `admin/staff/RolesPage.tsx`, `admin/collections/CollectionsPage.tsx`, `admin/admissions/AdmissionsPage.tsx`, `admin/guides/GuideApplicationsPage.tsx`; `circuits/{CircuitEditorPage,CircuitsPage}.tsx`, `circuits/components/{CircuitForm,StartTimesField,StopsEditor}.tsx`; `verification/components/StageTrack.tsx`, `onboarding/components/DocumentUpload.tsx`, `events/EventsPage.tsx`. El diff completo se contrasta mediante `output/playwright/verify-integrity.cjs`.

**Antes → después:** matriz de roles contenida con scroll local y primera columna de 192 px; encabezado crema, tipografía sin transformación, objetivos de 44 px; grillas de cobros y circuito con mínimo cero; controles de paradas/horarios envuelven en móvil; marcadores de etapa de 32 px; párrafos limitados a 72 caracteres; botón de tipo de circuito con token de acción. No se alteran reglas de revisión, publicación, asignación ni cobro.

**Referencias:** sistema global §§4–5 y especificación `MIGRATION.md`. **Evidencia:** `brand-audit/admin-*`, `brand-final/admin-*`, hoja de rol y revisión documental. **Verificación:** AST funcional equivalente a la línea base; hashes de las zonas protegidas intactos; tipos, lint, 36 tests y build pasan. Los documentos se abren para revisar presentación sin emitir decisiones.

## AUD-001 · 29/09/2026 · Auditoría de fidelidad de marca

**Selección:** `skill-selector` clasifica la petición como auditoría web → `impeccable audit` con registro de producto; Playwright aporta mediciones. Se consultó el manual Figma, incluidos construcción del símbolo, protección, paleta, tipografía, tono, usos y stickers.

**Agregados:** `AUDITORIA_MARCA_KPLAN.md`, inventario/hash de 289 archivos en `brand-audit/source-hashes.json`, inventario estático, capturas y matriz de 234 mediciones. Antes de implementar el lote siguiente, `brand-audit/integrity.json` confirmó cero cambios sobre estos 289 archivos durante la auditoría.

**Resultado:** identidad sólida; seis correcciones de presentación H01–H06. Fotos demo y oportunidades editoriales se separan del alcance obligatorio. El informe conserva las fuentes y los límites de la evaluación.

## VIS-005 · 29/09/2026 · Correcciones de marca y pulido

**Selección iterativa:** el objetivo pasa de auditar a terminar los arreglos aprobados → `frontend-ui-engineering` como skill primaria; `impeccable` aporta registro de producto y auditoría final. No se introducen nuevas dependencias.

| Hallazgo | Archivo | Antes → después | Evidencia |
| --- | --- | --- | --- |
| H01 | `app/layout/Sidebar.tsx` | Cabecera 64→72 px, margen del logo 14→18 px; control recentrado | Matriz final, logo 36 px sin deformar |
| H02 | `AppShell.tsx`, `Topbar.tsx`, `styles/base.css` | Sin identidad en modo contraído→símbolo existente en topbar. Selector CSS sobre el estado ARIA del control existente | `brand-final/state-collapsed.png`, `final-checks.json` |
| H03 | `Sidebar.tsx`, `ui/styles.ts`, `ui/IconButton.tsx` | Iconos principales 16/18/19→20 px, trazo efectivo 2. Metadatos y miniaturas conservan su escala | Matriz CSS efectiva, no solo atributos SVG |
| H04 | `Topbar.tsx` | Padding móvil 16→12 px; gaps 12/8→4 px. Desktop conserva su separación | Eventos y agenda a seis anchos |
| H05 | `places/components/AppPreview.tsx` | Blanco sobre terracota/categorías claras→acción con blanco o categoría con carbón | Gastronomía 5,32; ciudad 4,63; naturaleza 4,82; cultura 5,25:1 |
| H06 | `brand/Logo.tsx` | Comentarios “león”/ruta ausente→caballo del Güegüense/maestro local | Sin cambios de trazados, exports ni constantes |

**Documentación:** actualización de `DESIGN.md` y `MIGRATION.md`; creación del informe, índice de evidencia y cierre. `index.html` ya tenía espacios finales antes del lote: se conservan. `pnpm-lock.yaml` preexistente se conserva.

**Verificación:** `typecheck-final.log`, `lint-final.log`, `test-final.log`, `build-final.log`; 132 archivos protegidos intactos y comparación estructural de TS/TSX. La medición final de categorías se repite después de la última corrección. Los resultados iniciales de interacción se conservan junto a la repetición sincronizada; `CIERRE.md` explica sus diferencias.

## VIS-006 · 29/09/2026 · Estado de hora seleccionada y cierre

**Selección:** `skill-selector` → `frontend-ui-engineering` para el ajuste de distribución; `impeccable audit` para cerrar la revisión. **Archivo:** `arrivals/components/DayPanel.tsx`.

**Antes → después:** cabecera de día y fila del filtro por hora sin envoltura → `flex-wrap`. A 320 px el intervalo, el número de personas y “Todo el día” disponen de líneas propias cuando lo necesitan. No se cambia la URL, selección, conteo ni acción para quitar el filtro.

**Evidencia:** `brand-final/selected-hour-{320,390}.png`, con datos cargados; `selected-hour.json` confirma 320/320 y 390/390 px. El estado se reproduce con la URL existente `/?fecha=2026-09-29&hora=660`. Se conserva el desplazamiento horizontal interno del calendario.

**Cierre:** `EVIDENCIAS.md` indexa las 39 combinaciones de perfil/ruta y los estados complementarios; `CIERRE.md` relaciona requisitos, pruebas y límites. `report.cjs` produce el resumen y el inventario de diez archivos cambiados desde la auditoría (nueve de presentación/comentarios y `DESIGN.md`). Tipos, lint, tests, build e integridad se vuelven a comprobar después de este ajuste.
