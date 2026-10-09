import { describe, expect, it } from 'vitest'
import { accountNameBody, apiAccountPageSchema, apiAccountSchema, toAccount, toAccountPage } from './account-api.schema'

const ACCOUNT = {
  id: '0194-negocio',
  created_at: '2026-10-05T14:30:00Z',
  email: 'negocio@example.com',
  first_name: 'Luis',
  last_name: 'Gómez',
  name: 'Luis Gómez',
  status: 'active',
  verified: true,
  role: 'negocio',
  superuser: false,
  staff_role: null,
  organization: { id: '0194-org', kind: 'business', name: 'Cafetín El Sacuanjoche', verified: true },
  provider: null,
  city: { id: '0194-leon', code: 'leon', name: 'León' },
}

const read = (patch: Record<string, unknown>) => toAccount(apiAccountSchema.parse({ ...ACCOUNT, ...patch }))

describe('el directorio de cuentas', () => {
  it('lee una cuenta con su organización y su ciudad', () => {
    expect(read({})).toEqual({
      id: '0194-negocio',
      name: 'Luis Gómez',
      firstName: 'Luis',
      lastName: 'Gómez',
      email: 'negocio@example.com',
      role: 'negocio',
      serviceRole: null,
      status: 'active',
      superuser: false,
      staffRole: null,
      organization: { id: '0194-org', kind: 'business', name: 'Cafetín El Sacuanjoche', verified: true },
      provider: null,
      city: 'León',
      createdAt: expect.stringMatching(/^2026-10-0[45]$/),
    })
  })

  it('una institución se trata como alcaldía, pero conserva la clase de su organización', () => {
    const account = read({ role: 'institucion', organization: { id: 'o', kind: 'institution', name: 'Casa de cultura', verified: true } })
    expect(account.role).toBe('alcaldia')
    expect(account.organization?.kind).toBe('institution')
  })

  it('guías y traductores son un solo papel, con lo que ofrecen según su perfil', () => {
    const provider = { id: 'p', status: 'active', services: ['guia', 'traductor'] }
    expect(read({ role: 'traductor', provider, organization: null })).toMatchObject({ role: 'guia', serviceRole: 'both' })
    expect(read({ role: 'traductor', provider: null, organization: null })).toMatchObject({ role: 'guia', serviceRole: 'translator' })
  })

  it('sin papel pero con perfil de prestador es un guía en revisión; sin nada, no tiene papel', () => {
    const provider = { id: 'p', status: 'in_review', services: ['guia'] }
    expect(read({ role: null, provider, organization: null, city: null })).toMatchObject({
      role: 'guia',
      serviceRole: 'guide',
      provider: { status: 'in_review' },
      city: null,
    })
    expect(read({ role: null, provider: null, organization: null })).toMatchObject({ role: null, serviceRole: null })
  })

  it('una persona del equipo sin aceptar está invitada; otra cuenta pendiente, sin activar', () => {
    expect(read({ role: 'admin', status: 'pending', organization: null }).status).toBe('invited')
    expect(read({ role: 'turista', status: 'pending', organization: null }).status).toBe('pending')
    expect(read({ status: 'closing' }).status).toBe('closing')
  })

  it('el rol del equipo llega con su id como texto', () => {
    expect(read({ role: 'admin', staff_role: { id: 3, name: 'Verificador' }, organization: null }).staffRole).toEqual({ id: '3', name: 'Verificador' })
  })

  it('lee la página con cuántas hay en total', () => {
    const page = toAccountPage(apiAccountPageSchema.parse({ next: true, previous: false, elements: 41, pages: 3, current: 1, results: [ACCOUNT] }))
    expect(page).toMatchObject({ current: 1, pages: 3, elements: 41, hasNext: true, hasPrevious: false })
    expect(page.results[0].id).toBe('0194-negocio')
  })

  it('el nombre se manda con los nombres del API', () => {
    expect(accountNameBody({ firstName: ' Luis ', lastName: ' Gómez Ruiz ' })).toEqual({ first_name: 'Luis', last_name: 'Gómez Ruiz' })
  })
})
