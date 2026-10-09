import type { ToastInput } from './toast-context'

type ToastListener = (toast: ToastInput) => void

const listeners = new Set<ToastListener>()

/** Un aviso desde fuera de React (p. ej., la red de errores de `query-client.ts`); lo muestra el `ToastProvider` montado. */
export function notifyToast(toast: ToastInput): void {
  listeners.forEach((listener) => listener(toast))
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
