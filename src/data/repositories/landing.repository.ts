import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import { uploadInstaller } from '../api/upload'
import type { AppReleaseInput, DemoRequestChange, DemoStatus, ReleasePlatform, ReleaseStatus } from '../models'
import {
  apiDemoRequestPageSchema,
  apiDemoRequestSchema,
  apiReleaseDownloadSchema,
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

  /** De la más nueva a la más vieja; `current` marca la que hoy baja la landing. */
  releases: async ({ platform, status, page = 1, pageSize = 20 }: ReleaseFilters = {}) =>
    toReleasePage(apiReleasePageSchema.parse(await http.get<unknown>(endpoints.appRelease.list, { query: { platform, status, page, page_size: pageSize } }))),

  /** Sube el instalador directo al bucket y registra la versión como borrador. */
  createRelease: async ({ platform, version, notes, file }: AppReleaseInput, onProgress?: (fraction: number) => void) => {
    const key = await uploadInstaller(platform, file, onProgress)
    return toRelease(
      apiReleaseSchema.parse(await http.post<unknown>(endpoints.appRelease.list, { body: { platform, version: version.trim(), notes: notes.trim(), file: key } })),
    )
  },

  /** Las notas cambian siempre; la versión, sólo en un borrador. */
  updateRelease: async (releaseId: string, change: { version?: string; notes?: string }) =>
    toRelease(
      apiReleaseSchema.parse(
        await http.patch<unknown>(endpoints.appRelease.detail(releaseId), {
          body: {
            ...(change.version !== undefined && { version: change.version.trim() }),
            ...(change.notes !== undefined && { notes: change.notes.trim() }),
          },
        }),
      ),
    ),

  publishRelease: async (releaseId: string) => toRelease(apiReleaseSchema.parse(await http.post<unknown>(endpoints.appRelease.publish(releaseId)))),

  withdrawRelease: async (releaseId: string) => toRelease(apiReleaseSchema.parse(await http.post<unknown>(endpoints.appRelease.withdraw(releaseId)))),

  deleteRelease: (releaseId: string) => http.delete(endpoints.appRelease.detail(releaseId)),

  /** Una URL firmada por minutos: se abre en cuanto llega. */
  downloadUrl: async (releaseId: string) => apiReleaseDownloadSchema.parse(await http.get<unknown>(endpoints.appRelease.download(releaseId))).url,
}
