import { describe, expect, it } from 'vitest'
import { applicationDocumentsSchema, applicationOrganizationSchema } from '../schemas/organization-application.schema'
import { admissionBlocker, resubmitBlocker, type OrganizationApplication, type OrganizationDocumentType } from './organization-application'
import type { DocumentStatus } from './review'

function application(
  overrides: Partial<OrganizationApplication>,
  documents: Partial<Record<OrganizationDocumentType, DocumentStatus>>,
): OrganizationApplication {
  return {
    id: 'orgapp-prueba',
    organizationId: 'org-prueba',
    userId: 'user-prueba',
    type: 'negocio',
    name: 'Prueba',
    legalName: 'Prueba, S.A.',
    ruc: 'J0310000123456',
    kind: 'Cafetería',
    city: 'Granada',
    address: 'De la Catedral 2 cuadras al lago',
    description: '',
    representative: { name: 'Ana', cedula: '001-120390-0012K', role: 'Dueña', phone: '+505 8888 8888', email: 'ana@correo.demo' },
    claimedStopIds: [],
    newStopId: null,
    submittedAt: '2026-09-20T09:00:00.000',
    stage: 'documents',
    stageSince: '2026-09-20T09:00:00.000',
    status: 'in_review',
    assigneeId: null,
    decisionNote: '',
    decidedAt: null,
    history: [],
    ...overrides,
    documents: Object.entries(documents).map(([type, status]) => ({
      id: type,
      type: type as OrganizationDocumentType,
      fileName: '',
      pages: [],
      number: null,
      detail: null,
      issuedOn: null,
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

const ALL_ACCEPTED = { ruc: 'accepted', 'matricula-municipal': 'accepted', 'cedula-representante': 'accepted' } as const

describe('postulación de organizaciones', () => {
  it('un negocio trae razón social y un RUC válido; una alcaldía no', () => {
    const base = { name: 'Café La Calzada', city: 'Granada', address: 'De la Catedral 2 cuadras al lago', description: 'x'.repeat(40), kind: 'Cafetería' }
    expect(applicationOrganizationSchema.safeParse({ ...base, type: 'negocio', legalName: 'Calzada, S.A.', ruc: 'J03-1000-0123456' }).success).toBe(true)
    expect(applicationOrganizationSchema.safeParse({ ...base, type: 'negocio', legalName: 'Calzada, S.A.', ruc: '123' }).success).toBe(false)
    expect(applicationOrganizationSchema.safeParse({ ...base, type: 'alcaldia', legalName: '', ruc: '', kind: '' }).success).toBe(true)
  })

  it('pide los documentos de su tipo con todas sus caras', () => {
    const page = (label: string) => ({ label, url: 'data:image/jpeg;base64,x' })
    const documents = [
      { type: 'carta-designacion', fileName: 'carta.pdf', pages: [page('Archivo')] },
      { type: 'cedula-representante', fileName: 'cedula.jpg', pages: [page('Frente')] },
    ]
    expect(applicationDocumentsSchema.safeParse({ type: 'alcaldia', documents }).success).toBe(false)
    documents[1].pages.push(page('Reverso'))
    expect(applicationDocumentsSchema.safeParse({ type: 'alcaldia', documents }).success).toBe(true)
  })

  it('pasa a decisión sólo con todo aceptado, también los opcionales que subió', () => {
    expect(admissionBlocker(application({}, ALL_ACCEPTED))).toBeNull()
    expect(admissionBlocker(application({}, { ...ALL_ACCEPTED, 'permiso-sanitario': 'pending' }))).toMatch(/Revisa/)
    expect(admissionBlocker(application({}, { ruc: 'accepted', 'cedula-representante': 'accepted' }))).toMatch(/Faltan/)
  })

  it('se manda de nuevo cuando ya no quedan documentos rechazados', () => {
    const asked = { status: 'changes_requested' } as const
    expect(resubmitBlocker(application(asked, { ...ALL_ACCEPTED, 'matricula-municipal': 'rejected' }))).toMatch(/matrícula/)
    expect(resubmitBlocker(application(asked, { ...ALL_ACCEPTED, 'matricula-municipal': 'pending' }))).toBeNull()
  })
})
