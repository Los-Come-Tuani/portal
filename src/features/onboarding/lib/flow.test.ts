import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyOrganization, type BusinessData } from '@/data/models'
import { EMPTY_APPLICANT } from '@/data/schemas/application.schema'
import {
  clearDraft,
  EMPTY_DRAFT,
  formErrorsFromApi,
  loadDraft,
  saveDraft,
  stepLabel,
  stepOfField,
  STEPS,
  validateStep,
  withKind,
} from './flow'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', memoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('los pasos', () => {
  it('postularse tiene cinco y corregir solo los que ya se llenaron', () => {
    expect(STEPS.apply).toEqual(['kind', 'profile', 'details', 'account', 'review'])
    expect(STEPS.correct).toEqual(['profile', 'details', 'review'])
  })

  it('el paso de lo que se sube se llama según la clase', () => {
    expect(stepLabel('details', 'business')).toBe('Horario y platillo')
    expect(stepLabel('details', 'institution')).toBe('Documento')
    expect(stepLabel('details', null)).toBe('Documento')
  })

  it('no se avanza del primer paso sin elegir la clase', () => {
    expect(validateStep('kind', EMPTY_DRAFT)).toEqual({ kind: 'Elige qué organización eres' })
    expect(validateStep('profile', EMPTY_DRAFT).kind).toBeDefined()
    expect(validateStep('kind', withKind(EMPTY_DRAFT, 'municipality'))).toEqual({})
  })

  it('la cuenta se valida con el prefijo del campo y la revisión pide confirmar', () => {
    expect(Object.keys(validateStep('account', EMPTY_DRAFT))).toContain('applicant.email')
    expect(validateStep('review', EMPTY_DRAFT)).toEqual({ accepted: 'Confirma que la información es verdadera' })
    expect(validateStep('review', { ...EMPTY_DRAFT, accepted: true })).toEqual({})
  })
})

describe('elegir la clase', () => {
  it('empieza de cero lo que dependía de ella y conserva la ciudad', () => {
    const business = { ...(emptyOrganization('business') as BusinessData), cityId: 'leon', name: 'Mi café', ruc: 'J0310000000001' }
    const draft = withKind({ ...EMPTY_DRAFT, data: business }, 'institution')

    expect(draft.data).toMatchObject({ kind: 'institution', cityId: 'leon', name: '' })
    expect(draft.data).not.toHaveProperty('ruc')
  })

  it('elegir la misma clase no borra lo escrito', () => {
    const business = { ...(emptyOrganization('business') as BusinessData), name: 'Mi café' }
    const draft = { ...EMPTY_DRAFT, data: business }

    expect(withKind(draft, 'business')).toBe(draft)
  })
})

describe('los errores que devuelve el API', () => {
  it('la foto y el documento se mandan por su clave, y el formulario los llama por su nombre', () => {
    expect(formErrorsFromApi({ 'signatureDish.photoKey': 'No encontramos ese archivo.', documentKey: 'No encontramos ese archivo.' })).toEqual({
      'signatureDish.photo': 'No encontramos ese archivo.',
      document: 'No encontramos ese archivo.',
    })
  })

  it('los datos de la cuenta cuelgan de `applicant`', () => {
    expect(formErrorsFromApi({ code: 'El código proporcionado no es válido.', password: 'Muy débil', ruc: 'Ya hay un comercio' })).toEqual({
      'applicant.code': 'El código proporcionado no es válido.',
      'applicant.password': 'Muy débil',
      ruc: 'Ya hay un comercio',
    })
  })

  it('cada campo cae en su paso', () => {
    expect(stepOfField('applicant.email')).toBe('account')
    expect(stepOfField('ruc')).toBe('profile')
    expect(stepOfField('cityId')).toBe('profile')
    expect(stepOfField('latitude')).toBe('profile')
    expect(stepOfField('hours')).toBe('details')
    expect(stepOfField('hours.2.opens')).toBe('details')
    expect(stepOfField('signatureDish.photo')).toBe('details')
    expect(stepOfField('document')).toBe('details')
    expect(stepOfField('accepted')).toBe('review')
    expect(stepOfField('algo.raro')).toBe('profile')
  })
})

describe('el borrador', () => {
  it('sobrevive a una recarga, sin la contraseña ni el código', () => {
    const data = { ...(emptyOrganization('business') as BusinessData), name: 'Mi café' }
    saveDraft({
      data,
      applicant: { ...EMPTY_APPLICANT, firstName: 'Luis', email: 'luis@example.com', code: '123456', password: 'Secreta123', passwordConfirm: 'Secreta123' },
      accepted: true,
    })

    const stored = sessionStorage.getItem('kplan.portal.application-draft.v2') ?? ''
    expect(stored).not.toContain('Secreta123')
    expect(stored).not.toContain('123456')

    const restored = loadDraft()
    expect(restored.data).toMatchObject({ kind: 'business', name: 'Mi café' })
    expect(restored.applicant).toMatchObject({ firstName: 'Luis', email: 'luis@example.com', code: '', password: '', passwordConfirm: '' })
    // lo que declaró no se restaura: hay que volver a confirmarlo
    expect(restored.accepted).toBe(false)
  })

  it('sin nada guardado, o con algo roto, empieza en blanco', () => {
    expect(loadDraft()).toEqual(EMPTY_DRAFT)
    sessionStorage.setItem('kplan.portal.application-draft.v2', '{no es json')
    expect(loadDraft()).toEqual(EMPTY_DRAFT)
  })

  it('una clase que ya no existe no se restaura, pero lo de la cuenta sí', () => {
    sessionStorage.setItem(
      'kplan.portal.application-draft.v2',
      JSON.stringify({ data: { kind: 'negocio', name: 'Viejo' }, applicant: { firstName: 'Luis' } }),
    )

    const restored = loadDraft()

    expect(restored.data).toBeNull()
    expect(restored.applicant.firstName).toBe('Luis')
  })

  it('se borra al enviar', () => {
    saveDraft({ ...EMPTY_DRAFT, data: emptyOrganization('municipality') })
    clearDraft()

    expect(loadDraft()).toEqual(EMPTY_DRAFT)
  })
})
