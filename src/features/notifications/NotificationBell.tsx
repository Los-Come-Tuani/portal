import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button, IconButton, Skeleton } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useLatestNotifications, useReadAllNotifications, useReadNotification, useUnreadNotifications } from '@/data/hooks/use-notifications'
import { NOTIFICATION_KIND_LABELS } from '@/data/models'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'

/**
 * La campana de avisos (`notification/`): cuántos no se han leído (se pregunta cada minuto) y, al
 * abrirla, los últimos diez. Tocar uno lo marca leído.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const unread = useUnreadNotifications()
  const latest = useLatestNotifications(open)
  const read = useReadNotification()
  const readAll = useReadAllNotifications()
  const count = unread.data ?? 0

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label={count > 0 ? `Avisos: ${count} sin leer` : 'Avisos'}
        icon={<Bell size={19} />}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-canvas tabular-nums"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
      {open && (
        <div id={id} role="dialog" aria-label="Avisos" className="absolute top-full right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] animate-rise rounded-kp border border-divider bg-surface shadow-pop">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3">
            <p className="text-body font-semibold text-ink">Avisos</p>
            {count > 0 && (
              <Button size="sm" variant="ghost" icon={<CheckCheck size={15} />} loading={readAll.isPending} onClick={() => readAll.mutate()}>
                Marcar todo leído
              </Button>
            )}
          </div>
          {latest.isPending ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : latest.isError ? (
            <p className="p-4 text-small text-danger">{errorMessage(latest.error)}</p>
          ) : latest.data.results.length === 0 ? (
            <p className="p-4 text-small text-muted">No tienes avisos. Aquí llegan, por ejemplo, las sanciones de tu cuenta y los pagos.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-divider overflow-y-auto">
              {latest.data.results.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => !notification.read && read.mutate(notification.id)}
                    className={cn('flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-canvas', !notification.read && 'bg-planned/5')}
                  >
                    <span className="flex items-center gap-2 text-caption text-muted">
                      {!notification.read && <span className="size-2 shrink-0 rounded-full bg-planned" aria-label="Sin leer" />}
                      {NOTIFICATION_KIND_LABELS[notification.kind] ?? notification.kind} · {formatDateTime(notification.createdAt)}
                    </span>
                    <span className="text-small font-semibold text-ink">{notification.title}</span>
                    {notification.body && <span className="text-small text-muted">{notification.body}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
