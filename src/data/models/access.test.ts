import { describe, expect, it } from 'vitest'
import { expandPermissions, IMPLIED_BY, isImplied, PERMISSION_GROUPS, PERMISSION_INFO, PERMISSIONS } from './access'

/** Los identificadores que entrega el API (`GET /auth/staff-permission/`). */
const API_PERMISSIONS = [
  'agenda.view',
  'billing.manage',
  'billing.view',
  'circuits.manage',
  'circuits.view',
  'content.moderate',
  'demos.manage',
  'demos.view',
  'guides.decide',
  'guides.review',
  'guides.view',
  'organizations.manage',
  'organizations.review',
  'organizations.view',
  'places.manage',
  'places.view',
  'releases.manage',
  'releases.view',
  'staff.manage',
  'users.manage',
  'users.view',
]

describe('permisos del equipo', () => {
  it('son los mismos que entrega el API', () => {
    expect([...PERMISSIONS].sort()).toEqual(API_PERMISSIONS)
  })

  it('cada permiso se describe una sola vez, en el módulo que le toca', () => {
    const listed = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id))
    expect([...listed].sort()).toEqual(API_PERMISSIONS)
    for (const permission of PERMISSIONS) {
      expect(PERMISSION_INFO[permission].label.length).toBeGreaterThan(0)
      expect(PERMISSION_INFO[permission].description.length).toBeGreaterThan(0)
    }
  })

  it('muestra el permiso de solo ver antes que los que cambian cosas', () => {
    for (const group of PERMISSION_GROUPS) {
      const ids = group.permissions.map((permission) => permission.id)
      for (const [viewing, stronger] of Object.entries(IMPLIED_BY)) {
        if (!ids.includes(viewing as (typeof ids)[number])) continue
        for (const permission of stronger ?? []) {
          expect(ids.indexOf(viewing as (typeof ids)[number])).toBeLessThan(ids.indexOf(permission))
        }
      }
    }
  })
})

describe('permisos que ya incluyen ver', () => {
  it('quien revisa, decide o administra un módulo también lo ve', () => {
    expect(expandPermissions(['guides.decide'])).toEqual(['guides.view', 'guides.decide'])
    expect(expandPermissions(['guides.review'])).toEqual(['guides.view', 'guides.review'])
    expect(expandPermissions(['organizations.review'])).toEqual(['organizations.view', 'organizations.review'])
    expect(expandPermissions(['users.manage'])).toEqual(['users.view', 'users.manage'])
    expect(expandPermissions(['billing.manage'])).toEqual(['billing.view', 'billing.manage'])
  })

  it('no repite lo que ya estaba marcado', () => {
    expect(expandPermissions(['guides.view', 'guides.decide'])).toEqual(['guides.view', 'guides.decide'])
  })

  it('no deduce nada hacia arriba ni entre módulos', () => {
    expect(expandPermissions(['guides.view'])).toEqual(['guides.view'])
    expect(expandPermissions(['content.moderate', 'staff.manage'])).toEqual(['content.moderate', 'staff.manage'])
    expect(expandPermissions([])).toEqual([])
  })

  it('sabe cuándo un permiso de solo ver ya viene dado por otro marcado', () => {
    expect(isImplied('guides.view', ['guides.decide'])).toBe(true)
    expect(isImplied('guides.view', ['places.manage'])).toBe(false)
    expect(isImplied('guides.review', ['guides.decide'])).toBe(false)
    expect(isImplied('agenda.view', ['guides.decide'])).toBe(false)
  })
})
