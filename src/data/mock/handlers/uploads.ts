import { z } from 'zod'
import { endpoints } from '../../api/endpoints'
import type { UploadedFile } from '../../models'
import { fail, parseBody, route } from '../http'

const MAX_LENGTH = 2_600_000

const payloadSchema = z.object({
  fileName: z.string().min(1).max(160),
  mime: z.string(),
  dataUrl: z.string().startsWith('data:'),
})

/** En la demo no hay dónde guardar archivos: la URL es el mismo contenido. */
export const uploadRoutes = [
  route(
    'POST',
    endpoints.uploads,
    ({ body }): UploadedFile => {
      const payload = parseBody(payloadSchema, body)
      if (payload.dataUrl.length > MAX_LENGTH) throw fail.invalid('El archivo es muy pesado para el modo demo')
      return { fileName: payload.fileName, url: payload.dataUrl }
    },
    { isPublic: true },
  ),
]
