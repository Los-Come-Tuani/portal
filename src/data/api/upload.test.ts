import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { http } from './http-client'
import { putToBucket, uploadFile, uploadProblem } from './upload'

const TICKET = {
  key: 'signature-dish-photo/0194.jpg',
  url: 'https://cuenta.r2.cloudflarestorage.com/kplan/signature-dish-photo/0194.jpg?X-Amz-Signature=abc',
  method: 'PUT' as const,
  headers: { 'Content-Type': 'image/jpeg' },
}

const MEGABYTE = 1024 * 1024

describe('lo que se avisa antes de subir', () => {
  it('la foto del platillo es una imagen de hasta 5 MB', () => {
    expect(uploadProblem('signature-dish-photo', { type: 'image/jpeg', size: 200_000 })).toBeNull()
    expect(uploadProblem('signature-dish-photo', { type: 'image/webp', size: 5 * MEGABYTE })).toBeNull()
    expect(uploadProblem('signature-dish-photo', { type: 'application/pdf', size: 1000 })).toMatch(/foto JPG, PNG o WebP/)
    expect(uploadProblem('signature-dish-photo', { type: 'image/png', size: 5 * MEGABYTE + 1 })).toBe('El archivo pesa más de 5 MB')
  })

  it('el documento legal es un PDF o una imagen de hasta 10 MB', () => {
    expect(uploadProblem('legal-document', { type: 'application/pdf', size: 900_000 })).toBeNull()
    expect(uploadProblem('legal-document', { type: 'image/png', size: 10 * MEGABYTE })).toBeNull()
    expect(uploadProblem('legal-document', { type: 'image/webp', size: 1000 })).toMatch(/PDF/)
    expect(uploadProblem('legal-document', { type: 'application/pdf', size: 10 * MEGABYTE + 1 })).toBe('El archivo pesa más de 10 MB')
  })

  it('un archivo vacío no se sube', () => {
    expect(uploadProblem('legal-document', { type: 'application/pdf', size: 0 })).toBe('El archivo está vacío')
  })
})

describe('el PUT al almacenamiento', () => {
  const file = new File(['contenido'], 'vigoron.jpg', { type: 'image/jpeg' })

  it('va directo a la URL firmada, con las cabeceras firmadas, el archivo como cuerpo y sin cookies', async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchFn)

    await putToBucket(TICKET, file)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(TICKET.url)
    expect(init.method).toBe('PUT')
    expect(init.headers).toEqual({ 'Content-Type': 'image/jpeg' })
    expect(init.body).toBe(file)
    // el almacenamiento no es nuestro servidor: ni cookies ni token CSRF
    expect(init.credentials).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('si el almacenamiento rechaza el archivo, avisa que no se pudo subir', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('SignatureDoesNotMatch', { status: 403 })))

    await expect(putToBucket(TICKET, file)).rejects.toMatchObject({ status: 403, message: expect.stringContaining('No pudimos subir') })
    vi.unstubAllGlobals()
  })

  it('sin almacenamiento en el API, dice que por ahora no se reciben archivos', async () => {
    const post = vi
      .spyOn(http, 'post')
      .mockRejectedValue(new ApiError(503, 'Tuvimos un problema de nuestro lado, intenta de nuevo en unos minutos'))

    await expect(uploadFile('legal-document', new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' }))).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('Por ahora no podemos recibir archivos'),
    })
    post.mockRestore()
  })

  it('si no hay conexión (o el CORS del bucket no lo permite), también', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

    const failure = await putToBucket(TICKET, file).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(0)
    vi.unstubAllGlobals()
  })
})
