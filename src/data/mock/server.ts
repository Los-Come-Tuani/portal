/**
 * Backend de demo: responde las mismas rutas que tendrá la API (ver
 * src/data/api/endpoints.ts) con los datos de src/data/mock/json, guardando
 * los cambios en localStorage. Se usa cuando VITE_API_URL está vacía.
 */
import { env } from '@/config/env'
import type { TransportRequest, TransportResponse } from '../api/http-client'
import { getDatabase, saveDatabase } from './db'
import { authRoutes, userFromToken } from './handlers/auth'
import { badgeRoutes } from './handlers/badges'
import { billingRoutes } from './handlers/billing'
import { couponRoutes } from './handlers/coupons'
import { eventRoutes } from './handlers/events'
import { organizationRoutes } from './handlers/organizations'
import { placeRoutes } from './handlers/places'
import { visitRoutes } from './handlers/visits'
import { MockHttpError, matchRoute, type MockRoute } from './http'

const routes: MockRoute[] = [
  ...authRoutes,
  ...organizationRoutes,
  ...placeRoutes,
  ...eventRoutes,
  ...couponRoutes,
  ...badgeRoutes,
  ...billingRoutes,
  ...visitRoutes,
]

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Cancelado', 'AbortError'))
    })
  })
}

export async function handleMockRequest(request: TransportRequest): Promise<TransportResponse> {
  await wait(env.mockLatencyMs, request.signal)

  for (const candidate of routes) {
    if (candidate.method !== request.method) continue
    const params = matchRoute(candidate, request.path)
    if (!params) continue

    try {
      const db = getDatabase()
      const user = userFromToken(db, request.token)
      if (!candidate.isPublic && !user) throw new MockHttpError(401, 'Sesión expirada, vuelve a iniciar sesión')
      if (candidate.roles && (!user || !candidate.roles.includes(user.role))) {
        throw new MockHttpError(403, 'No tienes permiso para hacer esto')
      }

      const result = await candidate.handler({
        params,
        query: request.query,
        body: request.body === undefined ? undefined : structuredClone(request.body),
        user,
        db,
      })
      if (request.method !== 'GET') saveDatabase(getDatabase())
      if (result === undefined) return { status: 204, data: null }
      return { status: 200, data: structuredClone(result) }
    } catch (error) {
      if (error instanceof MockHttpError) {
        return { status: error.status, data: { message: error.message, errors: error.fieldErrors } }
      }
      console.error('[backend de demo]', error)
      return { status: 500, data: { message: 'Algo salió mal, intenta de nuevo' } }
    }
  }

  return { status: 404, data: { message: `El backend de demo no tiene ${request.method} ${request.path}` } }
}
