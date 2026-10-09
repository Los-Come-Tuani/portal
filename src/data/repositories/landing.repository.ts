import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { AppReleaseChange, AppReleaseInput, DemoRequestChange, DemoStatus, ReleasePlatform, ReleaseStatus } from '../models'
import {
  apiDemoRequestPageSchema,
  apiDemoRequestSchema,
  apiReleasePageSchema,
  apiReleaseSchema,
  demoRequestPatch,
  toDemoRequest,
  toDemoRequestPage,
  toRelease,
  toReleasePage,
} from '../schemas/landing-api.schema'

interface PageQuery {
  page?: number
  pageSize?: number
}

export interface DemoRequestFilters extends PageQuery {
  status?: DemoStatus
  /** Nombre u organización (sin importar tildes) o correo. */
  search?: string
}

export interface ReleaseFilters extends PageQuery {
  platform?: ReleasePlatform
  status?: ReleaseStatus
}

/** Lo que alimenta la landing (docs/landing.md del repo del API): solicitudes de demo y versiones de la app. */
export const landingRepository = {
  /** De la más nueva a la más vieja. */
  demoRequests: async ({ status, search, page = 1, pageSize = 20 }: DemoRequestFilters = {}) =>
    toDemoRequestPage(
      apiDemoRequestPageSchema.parse(
        await http.get<unknown>(endpoints.demoRequest.list, { query: { status, search: search?.trim() || undefined, page, page_size: pageSize } }),
      ),
    ),

  updateDemoRequest: async (requestId: string, change: DemoRequestChange) =>
    toDemoRequest(apiDemoRequestSchema.parse(await http.patch<unknown>(endpoints.demoRequest.detail(requestId), { body: demoRequestPatch(change) }))),

  /** De la más nueva a la más vieja; `current` marca la que hoy se entrega con el formulario. */
  releases: async ({ platform, status, page = 1, pageSize = 20 }: ReleaseFilters = {}) =>
    toReleasePage(apiReleasePageSchema.parse(await http.get<unknown>(endpoints.appRelease.list, { query: { platform, status, page, page_size: pageSize } }))),

  /** Registra la versión con el link de su instalador, como borrador. */
  createRelease: async ({ platform, version, notes, link }: AppReleaseInput) =>
    toRelease(
      apiReleaseSchema.parse(
        await http.post<unknown>(endpoints.appRelease.list, { body: { platform, version: version.trim(), notes: notes.trim(), link: link.trim() } }),
      ),
    ),

  /** Las notas y el link cambian siempre; la versión, sólo en un borrador. */
  updateRelease: async (releaseId: string, change: AppReleaseChange) =>
    toRelease(
      apiReleaseSchema.parse(
        await http.patch<unknown>(endpoints.appRelease.detail(releaseId), {
          body: {
            ...(change.version !== undefined && { version: change.version.trim() }),
            ...(change.notes !== undefined && { notes: change.notes.trim() }),
            ...(change.link !== undefined && { link: change.link.trim() }),
          },
        }),
      ),
    ),

  publishRelease: async (releaseId: string) => toRelease(apiReleaseSchema.parse(await http.post<unknown>(endpoints.appRelease.publish(releaseId)))),

  withdrawRelease: async (releaseId: string) => toRelease(apiReleaseSchema.parse(await http.post<unknown>(endpoints.appRelease.withdraw(releaseId)))),

  deleteRelease: (releaseId: string) => http.delete(endpoints.appRelease.detail(releaseId)),
}
