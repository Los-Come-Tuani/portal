import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { subscribeToasts } from './toast-bridge'
import { ToastContext, type ToastInput } from './toast-context'

interface ToastItem extends ToastInput {
  id: number
}

/** Avisos como el snackbar de la app: tinta con texto crema, abajo a la derecha. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (toast: ToastInput) => {
      const id = ++nextId.current
      setToasts((items) => [...items.slice(-2), { ...toast, id }])
      window.setTimeout(() => dismiss(id), toast.tone === 'error' ? 7000 : 4500)
    },
    [dismiss],
  )

  useEffect(() => subscribeToasts(show), [show])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 in-data-[savebar]:bottom-24 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex animate-rise items-start gap-3 rounded-kp bg-ink px-4 py-3 text-canvas shadow-pop"
          >
            <span className="mt-0.5 text-canvas/90" aria-hidden="true">
              {toast.tone === 'error' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-small text-canvas/80">{toast.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(toast.id)}
              className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-sm text-canvas/90 hover:bg-canvas/10 hover:text-canvas"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
