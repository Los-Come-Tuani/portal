import { z } from 'zod'
import type { AppRelease, DemoRequest, DemoRequestChange, Page } from '../models'
import { apiPageSchema, toLocalDateTime, toPage } from './api-common'

/** Las solicitudes de demo y las versiones de la app como las habla el API (docs/landing.md del repo del API). */
export const apiDemoRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  organization: z.string(),
  kind: z.enum(['business', 'municipality', 'institution', 'tour_operator', 'other']),
  city: z.string(),
  message: z.string(),
  status: z.enum(['pending', 'delivered']),
  delivered_at: z.string().nullable(),
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  updated_by: z.string().nullable(),
})

export const apiDemoRequestPageSchema = apiPageSchema(apiDemoRequestSchema)

const local = (value: string | null) => (value ? toLocalDateTime(value) : null)

export function toDemoRequest(api: z.infer<typeof apiDemoRequestSchema>): DemoRequest {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    phone: api.phone,
    organization: api.organization,
    kind: api.kind,
    city: api.city,
    message: api.message,
    status: api.status,
    deliveredAt: local(api.delivered_at),
    notes: api.notes,
    createdAt: toLocalDateTime(api.created_at),
    updatedAt: local(api.updated_at),
    updatedBy: api.updated_by,
  }
}

export const toDemoRequestPage = (api: z.infer<typeof apiDemoRequestPageSchema>): Page<DemoRequest> => toPage(api, toDemoRequest)

/** Sólo lo que cambia: el API deja igual lo que no llega. */
export function demoRequestPatch(change: DemoRequestChange): Record<string, string> {
  return {
    ...(change.status !== undefined && { status: change.status }),
    ...(change.notes !== undefined && { notes: change.notes.trim() }),
  }
}

export const apiReleaseSchema = z.object({
  id: z.string(),
  platform: z.enum(['android', 'macos', 'windows']),
  version: z.string(),
  notes: z.string(),
  link: z.string(),
  status: z.enum(['draft', 'published', 'withdrawn']),
  current: z.boolean(),
  deliveries: z.number(),
  created_at: z.string(),
  created_by: z.string(),
  published_at: z.string().nullable(),
  withdrawn_at: z.string().nullable(),
})

export const apiReleasePageSchema = apiPageSchema(apiReleaseSchema)

export function toRelease(api: z.infer<typeof apiReleaseSchema>): AppRelease {
  return {
    id: api.id,
    platform: api.platform,
    version: api.version,
    notes: api.notes,
    link: api.link,
    status: api.status,
    current: api.current,
    deliveries: api.deliveries,
    createdAt: toLocalDateTime(api.created_at),
    createdBy: api.created_by,
    publishedAt: local(api.published_at),
    withdrawnAt: local(api.withdrawn_at),
  }
}

export const toReleasePage = (api: z.infer<typeof apiReleasePageSchema>): Page<AppRelease> => toPage(api, toRelease)
