import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import { apiNotificationPageSchema, apiNotificationSchema, toNotification, toNotificationPage } from '../schemas/notification-api.schema'

/** La bandeja de avisos de quien entró (docs/avisos.md del repo del API): cualquier sesión. */
export const notificationsRepository = {
  /** Los más nuevos primero. */
  latest: async (pageSize = 10) =>
    toNotificationPage(apiNotificationPageSchema.parse(await http.get<unknown>(endpoints.notification.list, { query: { page_size: pageSize } }))),

  /** Cuántos no se han leído: basta una página de uno y su `elements`. */
  unreadCount: async () =>
    apiNotificationPageSchema.parse(await http.get<unknown>(endpoints.notification.list, { query: { unread: true, page_size: 1 } })).elements,

  read: async (notificationId: string) => toNotification(apiNotificationSchema.parse(await http.post<unknown>(endpoints.notification.read(notificationId)))),

  readAll: () => http.post<void>(endpoints.notification.readAll),
}
