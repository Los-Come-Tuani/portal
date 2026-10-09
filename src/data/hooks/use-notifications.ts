import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsRepository } from '../repositories/notifications.repository'
import { useMutation } from './mutation'
import { queryKeys } from './query-keys'

/** Cada cuánto se pregunta por avisos nuevos con el portal abierto. */
const POLL_MS = 60_000

export function useUnreadNotifications(enabled = true) {
  return useQuery({ queryKey: queryKeys.notifications.unread, queryFn: notificationsRepository.unreadCount, refetchInterval: POLL_MS, enabled })
}

/** Los últimos avisos; se piden al abrir la campana. */
export function useLatestNotifications(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.notifications.latest, queryFn: () => notificationsRepository.latest(10), enabled })
}

export function useReadNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => notificationsRepository.read(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useReadAllNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsRepository.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}
