import { describe, expect, it } from 'vitest'
import { apiDemoRequestSchema, apiReleaseSchema, demoRequestPatch, toDemoRequest, toRelease } from './landing-api.schema'

const DEMO = {
  id: 'd1',
  name: 'Lucía Martínez',
  email: 'lucia@ejemplo.com',
  phone: '',
  organization: 'Café Sacuanjoche',
  kind: 'business',
  city: 'León',
  message: 'Queremos ver los cupones.',
  status: 'new',
  notes: '',
  created_at: '2026-10-08T15:00:00Z',
  updated_at: null,
  updated_by: null,
}

describe('una solicitud de demo', () => {
  it('pasa con la hora de Managua y sin nadie que la haya movido', () => {
    const request = toDemoRequest(apiDemoRequestSchema.parse(DEMO))
    expect(request).toMatchObject({ kind: 'business', status: 'new', updatedAt: null, updatedBy: null })
    expect(request.createdAt).toBe('2026-10-08T09:00:00.000')
  })

  it('no acepta una clase que el API no conoce', () => {
    expect(apiDemoRequestSchema.safeParse({ ...DEMO, kind: 'museo' }).success).toBe(false)
  })

  it('al atenderla sólo manda lo que cambió', () => {
    expect(demoRequestPatch({ status: 'contacted' })).toEqual({ status: 'contacted' })
    expect(demoRequestPatch({ notes: '  Llamar el lunes. ' })).toEqual({ notes: 'Llamar el lunes.' })
    expect(demoRequestPatch({ notes: '' })).toEqual({ notes: '' })
  })
})

describe('una versión de la app', () => {
  it('trae su archivo, si es la vigente y cuántas veces se descargó', () => {
    const release = toRelease(
      apiReleaseSchema.parse({
        id: 'v1',
        platform: 'android',
        version: '1.2.0',
        notes: '',
        status: 'published',
        current: true,
        file_name: 'kplan-1.2.0.apk',
        size: 41_234_567,
        downloads: 18,
        created_at: '2026-10-07T15:00:00Z',
        created_by: 'Rosa',
        published_at: '2026-10-08T15:00:00Z',
        withdrawn_at: null,
      }),
    )
    expect(release).toMatchObject({ current: true, fileName: 'kplan-1.2.0.apk', downloads: 18, withdrawnAt: null })
    expect(release.publishedAt).toBe('2026-10-08T09:00:00.000')
  })
})
