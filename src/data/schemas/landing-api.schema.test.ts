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
  status: 'pending',
  delivered_at: null,
  notes: '',
  created_at: '2026-10-08T15:00:00Z',
  updated_at: null,
  updated_by: null,
}

describe('una solicitud de demo', () => {
  it('pasa con la hora de Managua y sin nadie que la haya movido', () => {
    const request = toDemoRequest(apiDemoRequestSchema.parse(DEMO))
    expect(request).toMatchObject({ kind: 'business', status: 'pending', deliveredAt: null, updatedAt: null, updatedBy: null })
    expect(request.createdAt).toBe('2026-10-08T09:00:00.000')
  })

  it('entregada trae cuándo', () => {
    const request = toDemoRequest(apiDemoRequestSchema.parse({ ...DEMO, status: 'delivered', delivered_at: '2026-10-08T16:00:00Z' }))
    expect(request).toMatchObject({ status: 'delivered', deliveredAt: '2026-10-08T10:00:00.000' })
  })

  it('no acepta una clase ni un estado que el API no conoce', () => {
    expect(apiDemoRequestSchema.safeParse({ ...DEMO, kind: 'museo' }).success).toBe(false)
    expect(apiDemoRequestSchema.safeParse({ ...DEMO, status: 'new' }).success).toBe(false)
  })

  it('al atenderla sólo manda lo que cambió', () => {
    expect(demoRequestPatch({ status: 'delivered' })).toEqual({ status: 'delivered' })
    expect(demoRequestPatch({ notes: '  Le mandé el link. ' })).toEqual({ notes: 'Le mandé el link.' })
    expect(demoRequestPatch({ notes: '' })).toEqual({ notes: '' })
  })
})

describe('una versión de la app', () => {
  it('trae su link, si es la vigente y cuántas veces se entregó', () => {
    const release = toRelease(
      apiReleaseSchema.parse({
        id: 'v1',
        platform: 'android',
        version: '1.2.0',
        notes: '',
        link: 'https://drive.google.com/file/d/abc/view',
        status: 'published',
        current: true,
        deliveries: 18,
        created_at: '2026-10-07T15:00:00Z',
        created_by: 'Rosa',
        published_at: '2026-10-08T15:00:00Z',
        withdrawn_at: null,
      }),
    )
    expect(release).toMatchObject({ current: true, link: 'https://drive.google.com/file/d/abc/view', deliveries: 18, withdrawnAt: null })
    expect(release.publishedAt).toBe('2026-10-08T09:00:00.000')
  })
})
