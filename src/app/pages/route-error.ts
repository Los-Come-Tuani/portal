import { isRouteErrorResponse } from 'react-router'

/** Lo que dice cada navegador cuando ya no encuentra un módulo de la versión anterior. */
const STALE_CHUNK =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i

/**
 * Qué pasó, para elegir qué decirle a la persona: `stale` es un módulo que ya no existe porque se
 * publicó una versión nueva del portal con la página abierta.
 */
export function routeErrorKind(error: unknown): 'stale' | 'not-found' | 'unknown' {
  if (error instanceof Error && (error.name === 'ChunkLoadError' || STALE_CHUNK.test(error.message))) return 'stale'
  if (isRouteErrorResponse(error) && error.status === 404) return 'not-found'
  return 'unknown'
}
