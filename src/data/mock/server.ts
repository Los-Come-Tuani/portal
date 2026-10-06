/**
 * Backend de demo: responde las mismas rutas que tendrá la API (ver
 * src/data/api/endpoints.ts) con los datos de src/data/mock/json, guardando
 * los cambios en localStorage. Solo se usa con VITE_USE_MOCKS=true
 * (`npm run dev:demo`).
 */
import { env } from '@/config/env'
import type { TransportRequest, TransportResponse } from '../api/http-client'
import { getDatabase, saveDatabase } from './db'
import { admissionRoutes } from './handlers/admissions'
import { authRoutes, userFromSession } from './handlers/auth'
import { uploadRoutes } from './handlers/uploads'
import { badgeRoutes } from './handlers/badges'
import { billingRoutes } from './handlers/billing'
import { circuitRoutes } from './handlers/circuits'
import { couponRoutes } from './handlers/coupons'
import { eventRoutes } from './handlers/events'
import { guideRoutes } from './handlers/guides'
import { organizationRoutes } from './handlers/organizations'
import { placeRequestRoutes } from './handlers/place-requests'
import { placeRoutes } from './handlers/places'
import { staffRoleRoutes, userRoutes } from './handlers/users'
import { visitRoutes } from './handlers/visits'
import { MockHttpError, matchRoute, type MockRoute } from './http'
import { hasPermission } from './services/access'

const routes: MockRoute[] = [
  ...authRoutes,
  ...uploadRoutes,
  ...admissionRoutes,
  ...placeRequestRoutes,
  ...userRoutes,
  ...staffRoleRoutes,
  ...guideRoutes,
  ...organizationRoutes,
  ...placeRoutes,
  ...circuitRoutes,
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
      const user = userFromSession(db)
      if (!candidate.isPublic && !user) throw new MockHttpError(401, 'Sesión expirada, vuelve a iniciar sesión')
      if (candidate.roles && (!user || !candidate.roles.includes(user.role))) {
        throw new MockHttpError(403, 'No tienes permiso para hacer esto')
      }
      if (candidate.permissions && (!user || !hasPermission(db, user, candidate.permissions))) {
        throw new MockHttpError(403, 'Tu rol no tiene permiso para hacer esto')
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
