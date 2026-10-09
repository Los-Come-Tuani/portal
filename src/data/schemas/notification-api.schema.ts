import { z } from 'zod'
import type { AppNotification, Page } from '../models'
import { apiPageSchema, toLocalDateTime, toPage } from './api-common'

/** Los avisos como los habla el API (`notification/`, docs/avisos.md del repo del API). */
export const apiNotificationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.string()),
  read: z.boolean(),
  created_at: z.string(),
})

export const apiNotificationPageSchema = apiPageSchema(apiNotificationSchema)

export function toNotification(api: z.infer<typeof apiNotificationSchema>): AppNotification {
  return { id: api.id, kind: api.kind, title: api.title, body: api.body, data: api.data, read: api.read, createdAt: toLocalDateTime(api.created_at) }
}

export const toNotificationPage = (api: z.infer<typeof apiNotificationPageSchema>): Page<AppNotification> => toPage(api, toNotification)
