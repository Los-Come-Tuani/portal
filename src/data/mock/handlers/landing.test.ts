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

type Release = { id: string; version: string; status: string; current: boolean }
type Page<T> = { elements: number; results: T[] }

function signInWith(...permissions: Parameters<typeof hasPermission>[2]) {
  const db = getDatabase()
  const user = db.users.find((item) => hasPermission(db, item, permissions))
  if (!user) throw new Error('La demo no tiene a nadie del equipo con esos permisos')
  demoSession.open(user.id)
}

async function upload(version: string) {
  const ticket = (await request('POST', '/app-release/upload/', { platform: 'android', size: 50_000_000 })).data as { key: string }
  return request('POST', '/app-release/', { platform: 'android', version, notes: '', file: ticket.key })
}

/** El backend de demo responde como el API de F9 (docs/landing.md). */
describe('backend de demo: versiones y solicitudes de demo', () => {
  beforeEach(() => {
    storage.clear()
    resetDatabase()
    signInWith('releases.manage', 'demos.manage')
  })

  it('publicar una versión la vuelve la vigente y retirarla devuelve la anterior', async () => {
    const created = (await upload('2.0.0')).data as Release
    expect(created).toMatchObject({ status: 'draft', current: false })

    const published = (await request('POST', `/app-release/${created.id}/publish/`)).data as Release
    expect(published.current).toBe(true)

    const withdrawn = (await request('POST', `/app-release/${created.id}/withdraw/`)).data as Release
    expect(withdrawn).toMatchObject({ status: 'withdrawn', current: false })
    const live = ((await request('GET', '/app-release/', undefined, { status: 'published' })).data as Page<Release>).results.find((item) => item.current)
    expect(live?.version).toBe('1.0.0')
  })

  it('una versión repetida en la misma plataforma responde 409 en version', async () => {
    const again = await upload('1.0.0')
    expect(again.status).toBe(409)
    expect((again.data as { errors: Record<string, string> }).errors.version).toContain('1.0.0')
  })

  it('sólo se borra un borrador', async () => {
    const releases = ((await request('GET', '/app-release/')).data as Page<Release>).results
    const draft = releases.find((item) => item.status === 'draft')
    const live = releases.find((item) => item.current)
    expect((await request('DELETE', `/app-release/${live?.id}/`)).status).toBe(409)
    expect((await request('DELETE', `/app-release/${draft?.id}/`)).status).toBe(204)
  })

  it('atender una solicitud anota quién y la saca de las nuevas', async () => {
    const before = (await request('GET', '/demo-request/', undefined, { status: 'new' })).data as Page<{ id: string }>
    const first = before.results[0]
    const updated = (await request('PATCH', `/demo-request/${first.id}/`, { status: 'contacted', notes: 'Llamada el lunes.' })).data as {
      status: string
      updated_by: string | null
    }
    expect(updated.status).toBe('contacted')
    expect(updated.updated_by).not.toBeNull()
    const after = (await request('GET', '/demo-request/', undefined, { status: 'new' })).data as Page<{ id: string }>
    expect(after.elements).toBe(before.elements - 1)
  })

  it('busca sin importar tildes', async () => {
    const found = (await request('GET', '/demo-request/', undefined, { search: 'cafe' })).data as Page<{ organization: string }>
    expect(found.results.map((item) => item.organization)).toEqual(['Café Sacuanjoche'])
  })
})
