import { describe, expect, it } from 'vitest'
import {
  emptyOrganization,
  sameHoursEveryDay,
  type BusinessData,
  type InstitutionData,
  type MunicipalityData,
  type OrganizationData,
} from '../models/application'
import { EMPTY_APPLICANT, validateApplicant, validateDetails, validateProfile } from './application.schema'

const PHOTO = { key: 'signature-dish-photo/0194.jpg', url: null, fileName: '0194.jpg' }
const DOCUMENT = { key: 'legal-document/acta.pdf', url: null, fileName: 'acta.pdf' }

function business(patch: Partial<BusinessData> = {}): BusinessData {
  return {
    ...(emptyOrganization('business') as BusinessData),
    cityId: 'c1',
    businessTypeId: 't1',
    ruc: 'J0310000000001',
    name: 'El Sacuanjoche',
    address: 'Frente a la catedral',
    phone: '2311-0000',
    latitude: 12.4379,
    longitude: -86.878,
    hours: sameHoursEveryDay('08:00', '17:00', [0]),
    signatureDish: { name: 'Vigorón', description: '', referencePrice: '120', currency: 'NIO', photo: PHOTO },
    ...patch,
  }
}

function institution(patch: Partial<InstitutionData> = {}): InstitutionData {
  return {
    ...(emptyOrganization('institution') as InstitutionData),
    cityId: 'c1',
    institutionTypeId: 'i1',
    name: 'Teatro Municipal',
    contactEmail: 'teatro@example.com',
    phone: '2311-1111',
    document: DOCUMENT,
    ...patch,
  }
}

function municipality(patch: Partial<MunicipalityData> = {}): MunicipalityData {
  return {
    ...(emptyOrganization('municipality') as MunicipalityData),
    cityId: 'c1',
    name: 'Alcaldía de León',
    contactEmail: 'alcaldia@example.com',
    phone: '2311-2222',
    document: DOCUMENT,
    ...patch,
  }
}

const both = (data: OrganizationData) => ({ ...validateProfile(data), ...validateDetails(data) })

describe('un comercio', () => {
  it('con todo lo que pide el API no tiene errores', () => {
    expect(both(business())).toEqual({})
  })

  it('dice qué falta, campo por campo, en un formulario vacío', () => {
    const errors = both(emptyOrganization('business'))

    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(['cityId', 'businessTypeId', 'name', 'ruc', 'address', 'phone', 'latitude', 'longitude', 'signatureDish.name', 'signatureDish.referencePrice', 'signatureDish.photo']),
    )
    expect(errors.latitude).toBe('Marca el punto en el mapa')
    expect(errors['signatureDish.photo']).toBe('Sube la foto del platillo')
  })

  it('acepta el RUC con espacios y en minúsculas, como el API', () => {
    expect(validateProfile(business({ ruc: ' j031 0000 000001 ' }))).toEqual({})
    expect(validateProfile(business({ ruc: 'J031' })).ruc).toMatch(/13 a 16/)
  })

  it('el teléfono usa el mismo formato que el API y el otro teléfono es opcional', () => {
    expect(validateProfile(business({ phone: 'llámame' })).phone).toBeDefined()
    expect(validateProfile(business({ phone: '+505 8888 8888', alternatePhone: '' }))).toEqual({})
    expect(validateProfile(business({ alternatePhone: 'x' })).alternatePhone).toBeDefined()
  })

  it('el punto tiene que caer en Nicaragua', () => {
    expect(validateProfile(business({ latitude: 40.4, longitude: -3.7 })).latitude).toMatch(/dentro de Nicaragua/)
    expect(validateProfile(business({ latitude: 12.1, longitude: -70 })).longitude).toMatch(/dentro de Nicaragua/)
    expect(validateProfile(business({ latitude: null, longitude: null })).latitude).toBe('Marca el punto en el mapa')
  })

  it('un día abierto necesita las dos horas y no puede abrir y cerrar a la misma', () => {
    const hours = sameHoursEveryDay('08:00', '17:00')
    hours[1] = { weekday: 2, closed: false, opens: '', closes: '17:00' }
    hours[2] = { weekday: 3, closed: false, opens: '09:00', closes: '09:00' }

    const errors = validateDetails(business({ hours }))

    expect(errors['hours.1.opens']).toBe('Escribe la hora de apertura')
    expect(errors['hours.2.closes']).toBe('Abre y cierra a la misma hora')
    // un cierre anterior a la apertura es la madrugada, y es válido
    expect(validateDetails(business({ hours: sameHoursEveryDay('18:00', '01:00') }))).toEqual({})
  })

  it('un día cerrado no necesita horas', () => {
    expect(validateDetails(business({ hours: sameHoursEveryDay('08:00', '17:00', [0, 6]) }))).toEqual({})
  })

  it('el precio es un número positivo con hasta dos decimales, con coma o con punto', () => {
    const price = (referencePrice: string) =>
      validateDetails(business({ signatureDish: { ...business().signatureDish, referencePrice } }))['signatureDish.referencePrice']

    expect(price('120')).toBeUndefined()
    expect(price('120,50')).toBeUndefined()
    expect(price('120.5')).toBeUndefined()
    expect(price('0')).toMatch(/mayor que cero/)
    expect(price('doce')).toMatch(/120 o 120.50/)
    expect(price('1.234')).toMatch(/120 o 120.50/)
  })
})

describe('una institución cultural y una alcaldía', () => {
  it('con todo lo que pide el API no tienen errores', () => {
    expect(both(institution())).toEqual({})
    expect(both(municipality())).toEqual({})
  })

  it('necesitan su documento y un correo de contacto válido', () => {
    expect(validateDetails(institution({ document: null })).document).toMatch(/existencia|acredita a la institución/i)
    expect(validateDetails(municipality({ document: null })).document).toMatch(/representas a la alcaldía/)
    expect(validateProfile(institution({ contactEmail: 'no-es-correo' })).contactEmail).toBe('Escribe un correo válido')
    expect(validateProfile(municipality({ contactEmail: '' })).contactEmail).toBe('Escribe un correo válido')
  })

  it('la institución elige su tipo y la alcaldía no tiene tipo', () => {
    expect(validateProfile(institution({ institutionTypeId: '' })).institutionTypeId).toBe('Elige el tipo de institución')
    expect(validateProfile(municipality())).toEqual({})
  })
})

describe('la cuenta de quien se postula', () => {
  const applicant = { firstName: 'Luis', lastName: '', email: 'luis@example.com', code: '123456', password: 'Secreta123', passwordConfirm: 'Secreta123' }

  it('con nombre, correo, código y contraseña fuerte no tiene errores; el apellido es opcional', () => {
    expect(validateApplicant(applicant)).toEqual({})
  })

  it('pide lo mismo que el API para la contraseña y que coincida', () => {
    expect(validateApplicant({ ...applicant, password: 'corta', passwordConfirm: 'corta' }).password).toBeDefined()
    expect(validateApplicant({ ...applicant, password: 'sinnumeroAAA', passwordConfirm: 'sinnumeroAAA' }).password).toBe('Agrega un número')
    expect(validateApplicant({ ...applicant, passwordConfirm: 'Otra12345' }).passwordConfirm).toBe('Las contraseñas no coinciden')
  })

  it('el código son seis dígitos', () => {
    expect(validateApplicant({ ...applicant, code: '12345' }).code).toBeDefined()
    expect(validateApplicant({ ...applicant, code: '12a456' }).code).toBeDefined()
  })

  it('un formulario vacío dice qué falta', () => {
    expect(Object.keys(validateApplicant(EMPTY_APPLICANT))).toEqual(expect.arrayContaining(['firstName', 'email', 'code', 'password', 'passwordConfirm']))
  })
})
