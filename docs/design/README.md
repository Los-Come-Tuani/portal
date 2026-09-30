# Migración visual del portal K’plan

Implementación del [plan de reestructuración](../../../../plans/002-redisenio-visual-portal-kplan.md), regida por el [sistema de diseño de marca](../../../../DESIGN_SYSTEM.md).

- [Decisiones y tokens](MIGRATION.md)
- [Bitácora por cambio](CHANGELOG.md)
- [Auditoría de marca y correcciones](AUDITORIA_MARCA_KPLAN.md)
- [Galería y cobertura de pantallas](EVIDENCIAS.md)
- [Cierre y límites de verificación](CIERRE.md)
- [Hashes de la línea base](baseline-hashes.json): 282 archivos de código, configuración y datos, incluido el lockfile preexistente sin seguimiento.
- Evidencias de navegador: [antes](../../output/playwright/before/) y [después](../../output/playwright/after/).

Las capturas utilizan las cuentas y datos demo existentes en contextos de navegador aislados. No representan actividad real. Los recorridos de revisión evitan guardar formularios y no alteran fixtures.

## Protocolo de alcance

La implementación se limita a CSS, tokens y cadenas de clases de presentación. Se conserva el JSX funcional, sus condiciones, hooks, eventos, textos, atributos accesibles, datos y rutas. La comparación final verifica hashes de las zonas congeladas y estructura de TypeScript excluyendo únicamente valores de clases de estilo.

## Selección iterativa de skills

Se aplica el algoritmo de `skill-selector` al comenzar cada fase y se documenta su decisión en la bitácora. `impeccable` controla auditoría y criterio visual; `frontend-ui-engineering` controla la implementación de presentación en React/Tailwind; `playwright` aporta evidencia de navegador. No se añaden dependencias de interfaz ni animaciones nuevas.
