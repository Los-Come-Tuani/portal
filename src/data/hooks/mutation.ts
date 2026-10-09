import {
  useMutation as useQueryMutation,
  type DefaultError,
  type MutateOptions,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'
import { useCallback } from 'react'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** `false`: la pantalla ya muestra el error a su manera (dentro del diálogo, en el campo) y no hace falta el aviso. */
      errorToast?: boolean
    }
  }
}

const handledErrors = new WeakSet<object>()

export function markErrorHandled(error: unknown): void {
  if (typeof error === 'object' && error !== null) handledErrors.add(error)
}

/** ¿Quien llamó a la mutación ya atendió este error (con su `onError` o con `mutateAsync`)? */
export function isErrorHandled(error: unknown): boolean {
  return typeof error === 'object' && error !== null && handledErrors.has(error)
}

/** Las opciones de una llamada a `mutate`, con su `onError` anotando el error como atendido. */
export function withHandledError<TData, TError, TVariables, TOnMutateResult>(
  options: MutateOptions<TData, TError, TVariables, TOnMutateResult> | undefined,
): MutateOptions<TData, TError, TVariables, TOnMutateResult> | undefined {
  const onError = options?.onError
  if (!onError) return options
  return {
    ...options,
    onError: (error, ...rest) => {
      markErrorHandled(error)
      onError(error, ...rest)
    },
  }
}

/**
 * El `useMutation` de TanStack. Anota los errores que atiende quien llama (`onError` al llamar a
 * `mutate`, o `mutateAsync`) para que la red de avisos de `query-client.ts` sólo muestre los que
 * nadie atendió. Las mutaciones del portal se crean con este.
 */
export function useMutation<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  const result = useQueryMutation(options)
  const { mutate: run, mutateAsync: runAsync } = result
  type Args = Parameters<typeof run>

  const mutate = useCallback(
    (...[variables, callOptions]: Args) => run(...([variables, withHandledError(callOptions)] as unknown as Args)),
    [run],
  )
  const mutateAsync = useCallback(
    (...args: Args) =>
      runAsync(...args).catch((error: unknown) => {
        markErrorHandled(error)
        throw error
      }),
    [runAsync],
  )

  return { ...result, mutate, mutateAsync }
}
