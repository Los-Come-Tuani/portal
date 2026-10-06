import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/errors'
import {
  apiChallengeSchema,
  apiLoginResponseSchema,
  apiSessionUserSchema,
  NO_ROLE_MESSAGE,
  toSessionUser,
  type ApiSessionUser,
} from './session.schema'

const base: ApiSessionUser = {
  id: '0194c1a2-0000-7000-8000-000000000001',
  email: 'ana@example.com',
  first_name: 'Ana',
  last_name: 'Gómez',
  name: 'Ana Gómez',
  username: null,
  birth_date: '1990-05-17',
  nationality: 'NI',
  status: 'active',
  verified: true,
  role: 'admin',
  groups: [{ id: 3, name: 'Verificación' }],
  permissions: ['guides.review', 'apiauth.view_apiuser'],
  organization_id: null,
  two_factor: { enabled: true, required: false },
  created_at: '2026-10-05T21:40:00Z',
}

describe('toSessionUser', () => {
  it('arma al equipo de K\'Plan con su rol interno y solo los permisos que el portal conoce', () => {
    const user = toSessionUser(base)
    expect(user).toMatchObject({
      id: base.id,
      name: 'Ana Gómez',
      email: 'ana@example.com',
      role: 'admin',
      staffRoleId: '3',
      staffRoleName: 'Verificación',
      permissions: ['guides.review'],
      twoFactor: { enabled: true, required: false },
      status: 'active',
      createdAt: '2026-10-05',
    })
  })

  it('no da permisos ni rol interno a un negocio, aunque el API los mande', () => {
    const user = toSessionUser({ ...base, role: 'negocio', organization_id: 'org-1' })
    expect(user.role).toBe('negocio')
    expect(user.organizationId).toBe('org-1')
    expect(user.permissions).toEqual([])
    expect(user.staffRoleId).toBeNull()
    expect(user.staffRoleName).toBeNull()
  })

  it('trata a la institución como alcaldía mientras el portal no las distinga', () => {
    expect(toSessionUser({ ...base, role: 'institucion' }).role).toBe('alcaldia')
    expect(toSessionUser({ ...base, role: 'alcaldia' }).role).toBe('alcaldia')
  })

  it('agrupa guías y traductores como guía, con su tipo de servicio', () => {
    expect(toSessionUser({ ...base, role: 'guia' })).toMatchObject({ role: 'guia', serviceRole: 'guide' })
    expect(toSessionUser({ ...base, role: 'traductor' })).toMatchObject({ role: 'guia', serviceRole: 'translator' })
    expect(toSessionUser({ ...base, role: 'turista' })).toMatchObject({ role: 'turista', serviceRole: null })
  })

  it('rechaza una cuenta sin rol con un mensaje que explica qué hacer', () => {
    try {
      toSessionUser({ ...base, role: null })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(403)
      expect((error as ApiError).message).toBe(NO_ROLE_MESSAGE)
    }
  })

  it('marca como suspendida solo a la cuenta suspendida', () => {
    expect(toSessionUser({ ...base, status: 'suspended' }).status).toBe('suspended')
    expect(toSessionUser({ ...base, status: 'active' }).status).toBe('active')
  })

  it('toma el primer grupo como rol interno cuando el equipo tiene varios', () => {
    const user = toSessionUser({
      ...base,
      groups: [
        { id: 7, name: 'Coordinación' },
        { id: 9, name: 'Soporte' },
      ],
    })
    expect(user.staffRoleName).toBe('Coordinación')
  })
})

describe('esquemas del API', () => {
  it('reconoce la respuesta de iniciar sesión y la del reto del 2FA', () => {
    expect(apiLoginResponseSchema.safeParse({ user: base }).success).toBe(true)
    expect(apiChallengeSchema.safeParse({ expires_in: 300 }).success).toBe(true)
    expect(apiChallengeSchema.safeParse({ user: base }).success).toBe(false)
    expect(apiLoginResponseSchema.safeParse({ expires_in: 300 }).success).toBe(false)
  })

  it('rechaza una persona con un papel que el API no conoce', () => {
    expect(apiSessionUserSchema.safeParse({ ...base, role: 'superheroe' }).success).toBe(false)
  })

  it('ignora los campos nuevos que el API agregue', () => {
    const parsed = apiSessionUserSchema.parse({ ...base, campo_nuevo: 1 })
    expect(parsed).not.toHaveProperty('campo_nuevo')
  })
})
