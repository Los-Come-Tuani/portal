import { MutationObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, ERROR_MESSAGES } from '@/data/api/errors'
import { markErrorHandled, withHandledError } from '@/data/hooks/mutation'
import { createQueryClient } from './query-client'

function setup() {
  const notify = vi.fn()
  return { notify, client: createQueryClient(notify) }
}

const failWith = (error: unknown) => () => Promise.reject(error)

/** Espera a que la red de avisos decida. */
const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('red de avisos de las mutaciones', () => {
  it('avisa del error de una mutación que nadie atiende', async () => {
    const { notify, client } = setup()
    const observer = new MutationObserver(client, { mutationFn: failWith(new ApiError(409, 'La campaña ya está agotada.')) })

    await observer.mutate().catch(() => undefined)
    await nextTurn()

    expect(notify).toHaveBeenCalledExactlyOnceWith({ title: 'La campaña ya está agotada.', tone: 'error' })
  })

  it('con un error que no es del API usa el mensaje genérico y en un 429 dice cuánto esperar', async () => {
    const { notify, client } = setup()

    await new MutationObserver(client, { mutationFn: failWith(new TypeError('x')) }).mutate().catch(() => undefined)
    await new MutationObserver(client, { mutationFn: failWith(new ApiError(429, ERROR_MESSAGES.tooManyRequests, {}, 120)) })
      .mutate()
      .catch(() => undefined)
    await nextTurn()

    expect(notify.mock.calls.map(([toast]) => toast.title)).toEqual([
      ERROR_MESSAGES.generic,
      `${ERROR_MESSAGES.tooManyRequests}. Puedes reintentar en 2 minutos.`,
    ])
  })

  it('no avisa si la mutación tiene su propio onError', async () => {
    const { notify, client } = setup()
    const onError = vi.fn()
    const observer = new MutationObserver<unknown, unknown, void>(client, { mutationFn: failWith(new ApiError(500, ERROR_MESSAGES.server)), onError })

    await observer.mutate().catch(() => undefined)
    await nextTurn()

    expect(onError).toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('no avisa si la mutación pide no hacerlo', async () => {
    const { notify, client } = setup()
    const observer = new MutationObserver(client, { mutationFn: failWith(new ApiError(404, 'x')), meta: { errorToast: false } })

    await observer.mutate().catch(() => undefined)
    await nextTurn()

    expect(notify).not.toHaveBeenCalled()
  })

  it('no avisa dos veces si quien llamó atendió el error en su onError', async () => {
    const { notify, client } = setup()
    const observer = new MutationObserver(client, { mutationFn: failWith(new ApiError(400, 'Revisa el nombre.')) })
    const unsubscribe = observer.subscribe(() => undefined)
    const onError = vi.fn()

    await observer.mutate(undefined, withHandledError({ onError })).catch(() => undefined)
    await nextTurn()

    expect(onError).toHaveBeenCalledOnce()
    expect(notify).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('si la pantalla ya se cerró, su onError no corre y se avisa igual', async () => {
    const { notify, client } = setup()
    const observer = new MutationObserver(client, { mutationFn: failWith(new ApiError(0, ERROR_MESSAGES.offline)) })
    const onError = vi.fn()

    await observer.mutate(undefined, withHandledError({ onError })).catch(() => undefined)
    await nextTurn()

    expect(onError).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledExactlyOnceWith({ title: ERROR_MESSAGES.offline, tone: 'error' })
  })

  it('no avisa si el error se atendió con mutateAsync', async () => {
    const { notify, client } = setup()
    const observer = new MutationObserver(client, { mutationFn: failWith(new ApiError(400, 'x')) })

    await observer.mutate().catch(markErrorHandled)
    await nextTurn()

    expect(notify).not.toHaveBeenCalled()
  })

  it('no avisa nada cuando la mutación sale bien', async () => {
    const { notify, client } = setup()

    await new MutationObserver(client, { mutationFn: () => Promise.resolve('ok') }).mutate()
    await nextTurn()

    expect(notify).not.toHaveBeenCalled()
  })
})
