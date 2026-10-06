import { describe, expect, it } from 'vitest'
import { emptyOrganization, sameHoursEveryDay, type BusinessData, type InstitutionData } from '../models/application'
import {
  apiApplicationSchema,
  apiApplicationSessionSchema,
  apiCitySchema,
  applicationBody,
  normalizePrice,
  normalizeRuc,
  organizationBody,
  resubmitBody,
  toMyApplication,
} from './application-api.schema'

const FILE = { key: 'signature-dish-photo/0194.jpg', url: 'https://storage.example/bucket/signature-dish-photo/0194.jpg?expires=300' }

/** Lo que responde `GET /organization-application/mine/` de un comercio rechazado. */
const BUSINESS_RESPONSE = {
  id: '0194-request',
  kind: 'business',
  organization_id: '0194-org',
  organization_name: 'El Sacuanjoche',
  status: 'rejected',
  submitted_at: '2026-10-05T14:30:00Z',
  resolved_at: '2026-10-05T16:00:00Z',
  resolution: {
    approved: false,
    reason: { code: 'ruc_invalido', label: 'El RUC no es válido' },
    note: 'Revisa el número.',
    resolved_at: '2026-10-05T16:00:00Z',
  },
  submitted: {
    kind: 'business',
    city_id: '0194-city',
    business_type_id: '0194-type',
    ruc: 'J0310000000001',
    name: 'El Sacuanjoche',
    address: 'Frente a la catedral',
    phone: '2311-0000',
    alternate_phone: '',
    latitude: 12.4379,
    longitude: -86.878,
    hours: [
      { weekday: 0, closed: true, opens: null, closes: null },
      { weekday: 1, closed: false, opens: '08:00:00', closes: '17:00:00' },
    ],
    signature_dish: { name: 'Vigorón', description: '', reference_price: 120.5, currency: 'NIO', photo: FILE },
  },
}

const INSTITUTION_RESPONSE = {
  ...BUSINESS_RESPONSE,
  kind: 'institution',
  status: 'submitted',
  resolved_at: null,
  resolution: null,
  submitted: {
    kind: 'institution',
    city_id: '0194-city',
    institution_type_id: '0194-theatre',
    name: 'Teatro Municipal',
    contact_email: 'teatro@example.com',
    phone: '2311-1111',
    document: { key: 'legal-document/acta.pdf', url: null },
  },
}

describe('lo que devuelve el API', () => {
  it('lee la solicitud de un comercio y la lleva al modelo del portal', () => {
    const application = toMyApplication(apiApplicationSchema.parse(BUSINESS_RESPONSE))

    expect(application.status).toBe('rejected')
    expect(application.organizationName).toBe('El Sacuanjoche')
    expect(application.resolution).toEqual({
      approved: false,
      reason: { code: 'ruc_invalido', label: 'El RUC no es válido' },
      note: 'Revisa el número.',
      resolvedAt: '2026-10-05T16:00:00Z',
    })

    const business = application.submitted as BusinessData
    expect(business.kind).toBe('business')
    expect(business.cityId).toBe('0194-city')
    expect(business.businessTypeId).toBe('0194-type')
    expect([business.latitude, business.longitude]).toEqual([12.4379, -86.878])
    // las horas llegan con segundos y el `<input type="time">` las quiere sin ellos
    expect(business.hours.find((row) => row.weekday === 1)).toEqual({ weekday: 1, closed: false, opens: '08:00', closes: '17:00' })
    // el precio se edita como texto
    expect(business.signatureDish.referencePrice).toBe('120.5')
    expect(business.signatureDish.photo).toEqual({ ...FILE, fileName: '0194.jpg' })
  })

  it('completa la semana: los días que el API no trae quedan cerrados, de lunes a domingo', () => {
    const business = toMyApplication(apiApplicationSchema.parse(BUSINESS_RESPONSE)).submitted as BusinessData

    expect(business.hours.map((row) => row.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(business.hours.filter((row) => row.closed).map((row) => row.weekday)).toEqual([2, 3, 4, 5, 6, 0])
  })

  it('lee la institución con su documento, que puede no tener enlace', () => {
    const application = toMyApplication(apiApplicationSchema.parse(INSTITUTION_RESPONSE))
    const institution = application.submitted as InstitutionData

    expect(application.resolution).toBeNull()
    expect(institution.institutionTypeId).toBe('0194-theatre')
    expect(institution.document).toEqual({ key: 'legal-document/acta.pdf', url: null, fileName: 'acta.pdf' })
  })

  it('rechaza una respuesta que no es lo que se espera', () => {
    expect(() => apiApplicationSchema.parse({ ...BUSINESS_RESPONSE, status: 'maybe' })).toThrow()
    expect(() => apiApplicationSchema.parse({ ...BUSINESS_RESPONSE, submitted: { kind: 'other' } })).toThrow()
  })

  it('lee el alta: la sesión y la solicitud sin lo que mandó', () => {
    const { submitted: _submitted, ...summary } = BUSINESS_RESPONSE
    const response = apiApplicationSessionSchema.parse({
      user: {
        id: 'u1',
        email: 'luis@example.com',
        first_name: 'Luis',
        last_name: 'Pérez',
        name: 'Luis Pérez',
        username: null,
        birth_date: null,
        nationality: 'NI',
        status: 'active',
        verified: true,
        role: 'negocio',
        groups: [],
        permissions: [],
        organization_id: '0194-org',
        organization: { id: '0194-org', kind: 'business', name: 'El Sacuanjoche', verified: false },
        two_factor: { enabled: false, required: false },
        created_at: '2026-10-05T14:30:00Z',
      },
      application: summary,
    })

    expect(response.user.organization).toEqual({ id: '0194-org', kind: 'business', name: 'El Sacuanjoche', verified: false })
  })

  it('lee las ciudades con su centro', () => {
    const city = apiCitySchema.parse({ id: 'c1', code: 'leon', name: 'León', latitude: 12.4379, longitude: -86.878, active: false })
    expect(city.latitude).toBe(12.4379)
  })
})

describe('lo que se manda al API', () => {
  const business = (): BusinessData => ({
    ...(emptyOrganization('business') as BusinessData),
    cityId: 'c1',
    businessTypeId: 't1',
    ruc: ' j031 0000 000001 ',
    name: ' El Sacuanjoche ',
    address: 'Frente a la catedral',
    phone: '2311-0000',
    latitude: 12.437900000000001,
    longitude: -86.878,
    hours: sameHoursEveryDay('08:00', '17:00', [0]),
    signatureDish: {
      name: 'Vigorón',
      description: '',
      referencePrice: '120,50',
      currency: 'NIO',
      photo: { ...FILE, fileName: 'vigoron.jpg' },
    },
  })

  it('arma el comercio con los nombres del API, el RUC limpio y las coordenadas como texto', () => {
    const body = organizationBody(business())

    expect(body).toMatchObject({
      city_id: 'c1',
      business_type_id: 't1',
      ruc: 'J0310000000001',
      name: 'El Sacuanjoche',
      latitude: '12.437900',
      longitude: '-86.878000',
    })
    // el ruido del punto flotante no llega al API: tiene un máximo de seis decimales
    expect(JSON.stringify(body)).not.toContain('12.437900000000001')
  })

  it('manda el platillo con su foto por la clave y el precio con punto', () => {
    const body = organizationBody(business()) as { signature_dish: Record<string, unknown> }

    expect(body.signature_dish).toEqual({
      name: 'Vigorón',
      description: '',
      reference_price: '120.50',
      currency: 'NIO',
      photo_key: FILE.key,
    })
  })

  it('un día cerrado no lleva horas y el otro teléfono se omite si está vacío', () => {
    const body = organizationBody(business()) as { hours: Record<string, unknown>[]; alternate_phone?: string }

    expect(body.hours.find((row) => row.weekday === 0)).toEqual({ weekday: 0, closed: true })
    expect(body.hours.find((row) => row.weekday === 1)).toEqual({ weekday: 1, closed: false, opens: '08:00', closes: '17:00' })
    expect(body).not.toHaveProperty('alternate_phone')
    expect(organizationBody({ ...business(), alternatePhone: '2222-3333' })).toMatchObject({ alternate_phone: '2222-3333' })
  })

  it('el alta lleva la cuenta y los datos; corregir lleva `kind` y no lleva cuenta', () => {
    const applicant = { firstName: 'Luis', lastName: '', email: ' luis@example.com ', code: '123456', password: 'Secreta123' }

    expect(applicationBody(applicant, business())).toMatchObject({
      email: 'luis@example.com',
      code: '123456',
      password: 'Secreta123',
      first_name: 'Luis',
      last_name: '',
      city_id: 'c1',
    })

    const correction = resubmitBody(business())
    expect(correction).toMatchObject({ kind: 'business', city_id: 'c1' })
    for (const account of ['email', 'code', 'password', 'first_name', 'last_name']) expect(correction).not.toHaveProperty(account)
  })

  it('la institución y la alcaldía mandan su documento por la clave', () => {
    const institution: InstitutionData = {
      ...(emptyOrganization('institution') as InstitutionData),
      cityId: 'c1',
      institutionTypeId: 'i1',
      name: 'Teatro',
      contactEmail: ' teatro@example.com ',
      phone: '2311-1111',
      document: { key: 'legal-document/acta.pdf', url: null, fileName: 'acta.pdf' },
    }

    expect(organizationBody(institution)).toEqual({
      city_id: 'c1',
      institution_type_id: 'i1',
      name: 'Teatro',
      contact_email: 'teatro@example.com',
      phone: '2311-1111',
      document_key: 'legal-document/acta.pdf',
    })
  })

  it('lo que devuelve el API sirve tal cual para corregir', () => {
    const application = toMyApplication(apiApplicationSchema.parse(BUSINESS_RESPONSE))
    const body = resubmitBody(application.submitted) as Record<string, unknown>

    // los mismos campos que pide el API al corregir, y la foto por su clave
    expect(Object.keys(body).sort()).toEqual(
      ['address', 'business_type_id', 'city_id', 'hours', 'kind', 'latitude', 'longitude', 'name', 'phone', 'ruc', 'signature_dish'].sort(),
    )
    expect((body.signature_dish as { photo_key: string }).photo_key).toBe(FILE.key)
    expect(body.latitude).toBe('12.437900')
  })

  it('normaliza el RUC y el precio', () => {
    expect(normalizeRuc(' j031 0000 000001')).toBe('J0310000000001')
    expect(normalizePrice(' 120,50 ')).toBe('120.50')
  })
})
