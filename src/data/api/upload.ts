import { z } from 'zod'
import { env } from '@/config/env'
import { UPLOAD_RULES, type StoredFile, type UploadKind } from '../models/application'
import { INSTALLER_MAX_BYTES, INSTALLERS, type ReleasePlatform } from '../models/landing'
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

/** Lo que el API va a rechazar de un instalador, dicho antes de subir. `null`: se puede subir. */
export function installerProblem(platform: ReleasePlatform, file: Pick<File, 'name' | 'size'>): string | null {
  const installer = INSTALLERS[platform]
  if (!file.name.toLowerCase().endsWith(installer.extension)) return `Para ${installer.label} sube un archivo ${installer.format} (${installer.extension})`
  if (file.size === 0) return 'El archivo está vacío'
  if (file.size > INSTALLER_MAX_BYTES) return `El instalador pesa más de ${INSTALLER_MAX_BYTES / MEGABYTE} MB`
  return null
}

/** Un instalador pesa cientos de MB: se sube con `XMLHttpRequest`, que sí avisa cuánto lleva. */
function putWithProgress(ticket: Ticket, file: File, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open(ticket.method, ticket.url)
    for (const [name, value] of Object.entries(ticket.headers)) request.setRequestHeader(name, value)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new ApiError(request.status, BUCKET_FAILED)))
    request.onerror = () => reject(new ApiError(0, BUCKET_FAILED))
    request.send(file)
  })
}

/** El modo demo no guarda instaladores (no caben en `localStorage`): el avance se simula. */
async function simulateProgress(onProgress: (fraction: number) => void): Promise<void> {
  for (const fraction of [0.2, 0.45, 0.7, 0.9, 1]) {
    await new Promise((resolve) => setTimeout(resolve, 150))
    onProgress(fraction)
  }
}

/**
 * Sube el instalador de una versión (docs/landing.md): pide la URL firmada a `app-release/upload/`
 * y hace el `PUT`. El tipo lo fija la plataforma, no el navegador (que no conoce `.apk` ni `.dmg`).
 * Devuelve la clave que se manda al crear la versión.
 */
export async function uploadInstaller(platform: ReleasePlatform, file: File, onProgress: (fraction: number) => void = () => {}): Promise<string> {
  const problem = installerProblem(platform, file)
  if (problem) throw new ApiError(400, problem)
  const ticket = ticketSchema.parse(await http.post<unknown>(endpoints.appRelease.upload, { body: { platform, size: file.size } }))
  await (env.useMocks ? simulateProgress(onProgress) : putWithProgress(ticket, file, onProgress))
  return ticket.key
}
