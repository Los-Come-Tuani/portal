import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpMethod } from '../../api/http-client'
import { getDatabase, resetDatabase } from '../db'
import { handleMockRequest } from '../server'
import { hasPermission } from '../services/access'
import { demoSession } from '../services/demo-session'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
})

const request = (method: HttpMethod, path: string, body?: unknown, query: Record<string, string> = {}) =>
  handleMockRequest({ method, path, query: new URLSearchParams(query), body })

type Release = { id: string; version: string; status: string; current: boolean; link: string }
type Demo = { id: string; status: string; delivered_at: string | null; updated_by: string | null }
type Page<T> = { elements: number; results: T[] }

const DRIVE = 'https://drive.google.com/file/d/kplan-2/view'

function signInWith(...permissions: Parameters<typeof hasPermission>[2]) {
  const db = getDatabase()
  const user = db.users.find((item) => hasPermission(db, item, permissions))
  if (!user) throw new Error('La demo no tiene a nadie del equipo con esos permisos')
  demoSession.open(user.id)
}

const create = (version: string, link = DRIVE) => request('POST', '/app-release/', { platform: 'android', version, notes: '', link })

/** El backend de demo responde como el API de F9 (docs/landing.md). */
describe('backend de demo: versiones y solicitudes de demo', () => {
  beforeEach(() => {
    storage.clear()
    resetDatabase()
    signInWith('releases.manage', 'demos.manage')
  })

  it('publicar una versión la vuelve la vigente y retirarla devuelve la anterior', async () => {
    const created = (await create('2.0.0')).data as Release
    expect(created).toMatchObject({ status: 'draft', current: false, link: DRIVE })

    const published = (await request('POST', `/app-release/${created.id}/publish/`)).data as Release
    expect(published.current).toBe(true)

    const withdrawn = (await request('POST', `/app-release/${created.id}/withdraw/`)).data as Release
    expect(withdrawn).toMatchObject({ status: 'withdrawn', current: false })
    const live = ((await request('GET', '/app-release/', undefined, { status: 'published' })).data as Page<Release>).results.find((item) => item.current)
    expect(live?.version).toBe('1.0.0')
  })

  it('una versión repetida en la misma plataforma responde 409 en version', async () => {
    const again = await create('1.0.0')
    expect(again.status).toBe(409)
    expect((again.data as { errors: Record<string, string> }).errors.version).toContain('1.0.0')
  })

  it('el link tiene que ser https', async () => {
    expect((await create('2.0.0', 'http://drive.google.com/x')).status).toBe(422)
  })

  it('sólo se borra un borrador', async () => {
    const releases = ((await request('GET', '/app-release/')).data as Page<Release>).results
    const draft = releases.find((item) => item.status === 'draft')
    const live = releases.find((item) => item.current)
    expect((await request('DELETE', `/app-release/${live?.id}/`)).status).toBe(409)
    expect((await request('DELETE', `/app-release/${draft?.id}/`)).status).toBe(204)
  })

  it('marcar una pendiente como entregada anota cuándo y quién', async () => {
    const before = (await request('GET', '/demo-request/', undefined, { status: 'pending' })).data as Page<Demo>
    const first = before.results[0]
    const updated = (await request('PATCH', `/demo-request/${first.id}/`, { status: 'delivered', notes: 'Le mandé el link.' })).data as Demo
    expect(updated.status).toBe('delivered')
    expect(updated.delivered_at).not.toBeNull()
    expect(updated.updated_by).not.toBeNull()
    const after = (await request('GET', '/demo-request/', undefined, { status: 'pending' })).data as Page<Demo>
    expect(after.elements).toBe(before.elements - 1)
  })

  it('busca sin importar tildes', async () => {
    const found = (await request('GET', '/demo-request/', undefined, { search: 'cafe' })).data as Page<{ organization: string }>
    expect(found.results.map((item) => item.organization)).toEqual(['Café Sacuanjoche'])
  })
})
