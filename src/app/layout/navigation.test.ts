import { describe, expect, it } from 'vitest'
import { expandPermissions, type Permission, type SessionUser } from '@/data/models'
import type { Session } from '@/features/auth/use-auth'
import { landingPath, navigationFor, type NavEntry } from './navigation'

/** Una persona del equipo con un rol que da exactamente estos permisos (el API ya los entrega expandidos). */
function teamMember(...permissions: Permission[]): Session {
  const granted = expandPermissions(permissions)
  return {
    // El menú solo lee `role`, `organization` y `can`.
    user: {} as SessionUser,
    organization: null,
    role: 'admin',
    isAdmin: true,
    organizationId: undefined,
    can: (...anyOf) => anyOf.some((permission) => granted.includes(permission)),
  }
}

function labels(entries: NavEntry[]): string[] {
  return entries.flatMap((entry) =>
    entry.kind === 'link' ? [entry.label] : entry.children.map((child) => `${entry.label} > ${child.label}`),
  )
}

describe('menú del equipo según su rol', () => {
  it('un rol sin permisos no ve ningún módulo', () => {
    const session = teamMember()
    expect(navigationFor(session)).toEqual([])
    expect(landingPath(session)).toBeNull()
  })

  it('quien solo ve guías y traductores no ve nada más', () => {
    const session = teamMember('guides.view')
    expect(labels(navigationFor(session))).toEqual(['Guías y traductores'])
    expect(landingPath(session)).toBe('/guias')
  })

  it('quien solo ve organizaciones ve sus solicitudes y la lista, y nada de guías', () => {
    expect(labels(navigationFor(teamMember('organizations.view')))).toEqual([
      'Organizaciones > Solicitudes',
      'Organizaciones > Todas',
    ])
  })

  it('quien decide sobre las guías también ve su cola, sin marcar "ver"', () => {
    expect(labels(navigationFor(teamMember('guides.decide')))).toEqual(['Guías y traductores'])
    expect(labels(navigationFor(teamMember('guides.review')))).toEqual(['Guías y traductores'])
  })

  it('ver lugares y circuitos abre el contenido, pero no moderarlo', () => {
    expect(labels(navigationFor(teamMember('places.view', 'circuits.view')))).toEqual([
      'Contenido > Lugares',
      'Contenido > Circuitos',
    ])
    expect(labels(navigationFor(teamMember('content.moderate')))).toEqual([
      'Contenido > Cupones',
      'Contenido > Eventos',
      'Contenido > Insignias',
    ])
  })

  it('ver usuarios no da acceso al equipo ni a los roles, y administrar el equipo sí', () => {
    expect(labels(navigationFor(teamMember('users.view')))).toEqual(['Todos los usuarios'])
    expect(labels(navigationFor(teamMember('staff.manage')))).toEqual([
      'Usuarios > Equipo interno',
      'Usuarios > Roles y permisos',
    ])
    expect(labels(navigationFor(teamMember('users.manage', 'staff.manage')))).toEqual([
      'Usuarios > Todos los usuarios',
      'Usuarios > Equipo interno',
      'Usuarios > Roles y permisos',
    ])
  })

  it('ver los cobros abre los cobros y las tarifas', () => {
    expect(labels(navigationFor(teamMember('billing.view')))).toEqual(['Finanzas > Cobros', 'Finanzas > Tarifas'])
  })

  it('la agenda solo aparece con su permiso y es la entrada de quien la tiene', () => {
    expect(labels(navigationFor(teamMember('guides.view')))).not.toContain('Agenda')
    const session = teamMember('agenda.view', 'guides.view')
    expect(labels(navigationFor(session))).toEqual(['Agenda', 'Guías y traductores'])
    expect(landingPath(session)).toBe('/')
  })
})
