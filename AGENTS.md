# Guía para agentes

Portal web de K'Plan (React 19, Vite 8, TypeScript, TanStack Query, React Hook Form + Zod).

## Léelo primero

Hay una hoja de ruta en curso para conectar el portal con el API real. Lee
`.cursor/memory/hoja-de-ruta.md`: tiene el estado, el diseño ya decidido del enlace (cliente
HTTP con cookies y CSRF, login con 2FA, página de Seguridad) y lo que falta. La memoria general
está en `C:\development\kplan\api\.cursor\memory\hoja-de-ruta.md`.

## Reglas del repo

- Español en código, textos, docs y commits (`feat(auth): ...`). Sin emojis.
- No se commitea en `main` ni se empuja sin que el usuario lo pida: se trabaja en
  `feat/hoja-de-ruta-api` o en otra rama `feat/...`.
- Todo `VITE_*` se compila dentro del bundle: solo valores públicos, nunca claves ni tokens.
  `.env.local` y cualquier `.env*.local` no se versionan.
- El modo demo es explícito (`VITE_USE_MOCKS=true`, `npm run dev:demo`). Un build de
  producción exige una `VITE_API_URL` con `https`; el publicado usa
  `https://develop-api.kplan.dev` (`.env.production`). La rama `staging` se publica en
  `https://staging-portal.kplan.dev`; `main` es producción (`https://portal.kplan.dev`).
- Antes de cerrar: `npm run typecheck && npm run lint && npm test`.
