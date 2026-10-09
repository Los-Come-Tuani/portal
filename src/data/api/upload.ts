import { z } from 'zod'
import { env } from '@/config/env'
import { UPLOAD_RULES, type StoredFile, type UploadKind } from '../models/application'
import { endpoints } from './endpoints'
import { ApiError } from './errors'
import { http } from './http-client'

const MEGABYTE = 1024 * 1024

const FORMATS: Record<UploadKind, string> = {
  'legal-document': 'un PDF o una foto JPG o PNG',
  'signature-dish-photo': 'una foto JPG, PNG o WebP',
  'place-photo': 'una foto JPG, PNG o WebP',
  'circuit-photo': 'una foto JPG, PNG o WebP',
  'event-photo': 'una foto JPG, PNG o WebP',
  'coupon-photo': 'una foto JPG, PNG o WebP',
}

/** Lo que el API va a rechazar, dicho antes de subir. `null`: el archivo se puede subir. */
export function uploadProblem(kind: UploadKind, file: Pick<File, 'type' | 'size'>): string | null {
  const rule = UPLOAD_RULES[kind]
  if (!rule.contentTypes.includes(file.type)) return `Sube ${FORMATS[kind]}`
  if (file.size === 0) return 'El archivo está vacío'
  if (file.size > rule.maxBytes) return `El archivo pesa más de ${rule.maxBytes / MEGABYTE} MB`
  return null
}

const ticketSchema = z.object({
  key: z.string(),
  url: z.string(),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()),
})

export type Ticket = z.infer<typeof ticketSchema>

const BUCKET_FAILED = 'No pudimos subir el archivo. Revisa tu conexión e intenta de nuevo.'

/**
 * El archivo va directo al almacenamiento, sin pasar por el API: un `PUT` a la URL firmada con
 * las cabeceras que firmó. Sin cookies ni token CSRF: esa petición no es para nuestro servidor.
 */
export async function putToBucket(ticket: Ticket, file: File): Promise<void> {
  let response: Response
  try {
    response = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: file })
  } catch {
    throw new ApiError(0, BUCKET_FAILED)
  }
  if (!response.ok) throw new ApiError(response.status, BUCKET_FAILED)
}

/** El modo demo no tiene bucket: el archivo viaja a su backend como `data:` y queda guardado ahí. */
async function putToDemoBucket(ticket: Ticket, file: File): Promise<void> {
  const { toFilePayload } = await import('./file-payload')
  await http.post<void>(endpoints.demoBucket, { body: { key: ticket.key, ...(await toFilePayload(file)) } })
}

/**
 * Sube un archivo en dos pasos, como lo pide el API (docs/archivos.md): pide una URL firmada y
 * hace el `PUT`. Devuelve la clave, que es lo que después se manda con la solicitud.
 */
export async function uploadFile(kind: UploadKind, file: File): Promise<StoredFile> {
  const problem = uploadProblem(kind, file)
  if (problem) throw new ApiError(400, problem)
  const ticket = ticketSchema.parse(
    await http.post<unknown>(endpoints.upload, { body: { kind, content_type: file.type, size: file.size } }),
  )
  await (env.useMocks ? putToDemoBucket(ticket, file) : putToBucket(ticket, file))
  return { key: ticket.key, url: null, fileName: file.name }
}
