import { MutationCache, QueryClient } from '@tanstack/react-query'
import { notifyToast } from '@/components/ui/toast-bridge'
import type { ToastInput } from '@/components/ui/toast-context'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { isErrorHandled } from '@/data/hooks/mutation'

/**
 * La red de avisos: si una mutación falla y nadie atiende el error (sin `onError` propio ni al
 * llamarla, sin `mutateAsync` y sin `meta.errorToast: false`), igual se le dice a la persona qué
 * pasó. Se decide en la siguiente vuelta, cuando ya corrieron los `catch` de `mutateAsync`.
 */
function warnUnhandledErrors(cache: MutationCache, notify: (toast: ToastInput) => void): void {
  cache.subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'error') return
    const { options } = event.mutation
    if (options.onError || options.meta?.errorToast === false) return
    const { error } = event.action
    setTimeout(() => {
      if (!isErrorHandled(error)) notify({ title: errorMessageWithWait(error), tone: 'error' })
    }, 0)
  })
}

export function createQueryClient(notify: (toast: ToastInput) => void = notifyToast): QueryClient {
  const mutationCache = new MutationCache()
  warnUnhandledErrors(mutationCache, notify)
  return new QueryClient({
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Un 4xx no se arregla reintentando.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  })
}

export const queryClient = createQueryClient()
