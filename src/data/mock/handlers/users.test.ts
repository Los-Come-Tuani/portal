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

const request = (method: HttpMethod, path: string, body?: unknown) => handleMockRequest({ method, path, query: new URLSearchParams(), body })

type Member = { id: string; role: { id: string; name: string } | null }

/** El backend de demo da y quita roles del equipo como el API (docs/roles.md). */
describe('backend de demo: roles del equipo', () => {
  let me = ''
  let role = ''

  beforeEach(() => {
    storage.clear()
    resetDatabase()
    const db = getDatabase()
    const manager = db.users.find((item) => item.status === 'active' && hasPermission(db, item, ['staff.manage']))
    if (!manager) throw new Error('La demo no tiene a nadie que administre el equipo')
    demoSession.open(manager.id)
    me = manager.id
    role = db.staffRoles.find((item) => !item.system)?.id ?? ''
  })

  const someone = (match: (user: ReturnType<typeof getDatabase>['users'][number]) => boolean) => {
    const db = getDatabase()
    const user = db.users.find((item) => item.id !== me && match(item))
    if (!user) throw new Error('La demo no tiene una cuenta así')
    return user
  }

  it('un turista entra al equipo con el rol', async () => {
    const db = getDatabase()
    const tourist = someone((user) => user.role === 'turista' && user.status === 'active' && !db.providers.some((item) => item.userId === user.id))
    const response = await request('POST', '/auth/user-role/', { user_id: tourist.id, role_id: role })
    expect(response.status).toBe(200)
    expect((response.data as Member).role?.id).toBe(role)
    const team = (await request('GET', '/auth/staff-member/')).data as Member[]
    expect(team.some((member) => member.id === tourist.id)).toBe(true)
  })

  it('una cuenta de organización o de guía no entra al equipo', async () => {
    const owner = someone((user) => user.role === 'negocio')
    const guide = someone((user) => user.role === 'guia')
    for (const user of [owner, guide]) {
      const response = await request('POST', '/auth/user-role/', { user_id: user.id, role_id: role })
      expect(response.status).toBe(409)
    }
  })

  it('sacar del equipo le quita el rol, pero no a uno mismo', async () => {
    const member = someone((user) => user.role === 'admin' && user.staffRoleId !== 'role-super-admin')
    const response = await request('POST', '/auth/staff-remove/', { user_id: member.id })
    expect(response.status).toBe(200)
    expect((response.data as Member).role).toBeNull()
    const team = (await request('GET', '/auth/staff-member/')).data as Member[]
    expect(team.some((item) => item.id === member.id)).toBe(false)
    expect((await request('POST', '/auth/staff-remove/', { user_id: me })).status).toBe(403)
  })
})
