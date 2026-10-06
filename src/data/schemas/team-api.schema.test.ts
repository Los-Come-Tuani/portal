import { describe, expect, it } from 'vitest'
import { apiInviteSchema, apiMemberSchema, apiRoleSchema, inviteBody, roleBody, roleReference, toMember, toRole } from './team-api.schema'

const ROLE = {
  id: 7,
  name: 'Observador de guías',
  description: 'Ve las solicitudes de guías.',
  permissions: ['guides.view', 'algo.raro'],
  members: 3,
  requires_two_factor: true,
  system: false,
  created_at: '2026-10-05T14:30:00Z',
}

const MEMBER = {
  id: '0194-user',
  name: 'Raquel Úbeda',
  email: 'raquel@example.com',
  role: { id: 7, name: 'Observador de guías' },
  status: 'active',
  created_at: '2026-10-05T14:30:00Z',
}

describe('los roles del equipo', () => {
  it('se leen con su id como texto, cuántas personas lo tienen y si exige el segundo factor', () => {
    const role = toRole(apiRoleSchema.parse(ROLE))

    expect(role).toMatchObject({ id: '7', name: 'Observador de guías', members: 3, requiresTwoFactor: true, system: false })
    // un permiso que el portal no conoce nunca abre una pantalla
    expect(role.permissions).toEqual(['guides.view'])
  })

  it('en la demo el id es un texto y se queda así', () => {
    expect(toRole(apiRoleSchema.parse({ ...ROLE, id: 'role-super-admin' })).id).toBe('role-super-admin')
  })

  it('se mandan con los nombres del API', () => {
    expect(roleBody({ name: ' Moderación ', description: ' Modera eventos. ', permissions: ['content.moderate'], requiresTwoFactor: false })).toEqual({
      name: 'Moderación',
      description: 'Modera eventos.',
      permissions: ['content.moderate'],
      requires_two_factor: false,
    })
  })
})

describe('las personas del equipo', () => {
  it('se leen con su rol', () => {
    expect(toMember(apiMemberSchema.parse(MEMBER))).toEqual({
      id: '0194-user',
      name: 'Raquel Úbeda',
      email: 'raquel@example.com',
      role: { id: '7', name: 'Observador de guías' },
      status: 'active',
      createdAt: expect.stringMatching(/^2026-10-0[45]$/),
    })
  })

  it('una invitación sin aceptar está invitada; una cuenta cerrándose o expulsada, sin acceso', () => {
    expect(toMember(apiMemberSchema.parse({ ...MEMBER, status: 'pending' })).status).toBe('invited')
    expect(toMember(apiMemberSchema.parse({ ...MEMBER, status: 'suspended' })).status).toBe('suspended')
    expect(toMember(apiMemberSchema.parse({ ...MEMBER, status: 'closing' })).status).toBe('suspended')
    expect(toMember(apiMemberSchema.parse({ ...MEMBER, status: 'expelled' })).status).toBe('suspended')
  })

  it('un superusuario sin rol del equipo llega con el rol en nulo', () => {
    expect(toMember(apiMemberSchema.parse({ ...MEMBER, role: null })).role).toBeNull()
  })

  it('la invitación dice si salió el correo', () => {
    expect(apiInviteSchema.parse({ ...MEMBER, status: 'pending', sent: false }).sent).toBe(false)
  })
})

describe('invitar', () => {
  it('parte el nombre en nombre y apellido, y manda el rol como número si lo es', () => {
    expect(inviteBody({ name: '  Ana  María Gómez ', email: ' ana@example.com ', staffRoleId: '7' })).toEqual({
      email: 'ana@example.com',
      first_name: 'Ana',
      last_name: 'María Gómez',
      role_id: 7,
    })
  })

  it('en la demo el rol es un texto', () => {
    expect(roleReference('role-super-admin')).toBe('role-super-admin')
    expect(inviteBody({ name: 'Ana', email: 'ana@example.com', staffRoleId: 'role-x' })).toMatchObject({ last_name: '', role_id: 'role-x' })
  })
})
