import { describe, expect, it } from 'vitest'
import { advanceBlocker, requiredChecks, requiredDocuments, type DocumentType, type GuideApplication } from './guide'
import type { DocumentStatus } from './review'

function application(overrides: Partial<GuideApplication>, documents: Partial<Record<DocumentType, DocumentStatus>> = {}): GuideApplication {
  return {
    id: 'app-prueba',
    userId: 'user-prueba',
    name: 'Prueba',
    email: 'prueba@correo.demo',
    phone: '',
    city: 'Granada',
    photoUrl: '',
    serviceRole: 'guide',
    languages: ['Español'],
    specialties: [],
    yearsExperience: 1,
    hasTransport: false,
    bio: '',
    references: [],
    submittedAt: '2026-09-20T09:00:00.000',
    stage: 'documents',
    stageSince: '2026-09-20T09:00:00.000',
    status: 'in_review',
    assigneeId: null,
    background: [],
    decisionNote: '',
    decidedAt: null,
    history: [],
    ...overrides,
    documents: Object.entries(documents).map(([type, status]) => ({
      id: type,
      type: type as DocumentType,
      fileName: '',
      pages: [],
      number: '',
      detail: null,
      issuedOn: '2026-01-01',
      expiresOn: null,
      uploadedAt: '2026-09-20T09:00:00.000',
      status,
      checks: [],
      note: '',
      reviewedBy: null,
      reviewedAt: null,
    })),
  }
}

describe('verificación de guías y traductores', () => {
  it('pide los documentos según lo que ofrece', () => {
    expect(requiredDocuments({ serviceRole: 'guide', hasTransport: false })).toEqual([
      'cedula',
      'record-policia',
      'carne-intur',
      'primeros-auxilios',
    ])
    expect(requiredDocuments({ serviceRole: 'translator', hasTransport: false })).toEqual([
      'cedula',
      'record-policia',
      'certificado-idioma',
    ])
    expect(requiredDocuments({ serviceRole: 'both', hasTransport: true })).toHaveLength(7)
  })

  it('el registro de INTUR sólo se verifica a quien da recorridos', () => {
    expect(requiredChecks({ serviceRole: 'translator' })).toEqual(['policia', 'referencias'])
    expect(requiredChecks({ serviceRole: 'both' })).toEqual(['policia', 'intur', 'referencias'])
  })

  it('pasa a antecedentes sólo con todos los documentos aceptados', () => {
    const accepted = { cedula: 'accepted', 'record-policia': 'accepted', 'certificado-idioma': 'accepted' } as const
    expect(advanceBlocker(application({ serviceRole: 'translator' }, accepted))).toBeNull()
    expect(advanceBlocker(application({ serviceRole: 'translator' }, { ...accepted, cedula: 'pending' }))).toMatch(/Revisa/)
    expect(advanceBlocker(application({ serviceRole: 'translator' }, { ...accepted, cedula: 'rejected' }))).toMatch(/rechazados/)
    expect(advanceBlocker(application({ serviceRole: 'guide' }, accepted))).toMatch(/Faltan/)
  })

  it('pasa a decisión con todas las verificaciones hechas, aunque alguna tenga observaciones', () => {
    const base = { serviceRole: 'translator', stage: 'background' } as const
    const check = (type: 'policia' | 'referencias', status: 'clear' | 'flagged') => ({
      type,
      status,
      note: '',
      checkedBy: null,
      checkedAt: null,
    })
    expect(advanceBlocker(application({ ...base, background: [check('policia', 'clear')] }))).toMatch(/Completa/)
    expect(
      advanceBlocker(application({ ...base, background: [check('policia', 'clear'), check('referencias', 'flagged')] })),
    ).toBeNull()
  })
})
