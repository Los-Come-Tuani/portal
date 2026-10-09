/**
 * Los guías y traductores de la demo con la forma de F5 (docs/prestadores.md del repo del API):
 * su perfil, sus documentos con el veredicto de quien los revisó y sus expedientes. Salen de los
 * guías de la app (ya aprobados) y de guide_applications.json (en revisión, con correcciones o
 * ya resueltos).
 */
import { addDays, type ISODate } from '@/lib/dates'
import { createRandom, hashSeed, type Random } from '@/lib/random'
import type { LanguageLevel, ServiceCode } from '../../models'
import type { SeedDocumentType } from '../catalog'
import { cityByName } from '../services/application-catalog'
import { toInstant } from '../services/applications'
import { CHANGES_REQUESTED, LANGUAGES, requiredTypes, type CredentialTypeCode } from '../services/provider-catalog'
import type { MockCredential, MockProvider, MockProviderRequest } from '../services/providers'
import { documentScans } from './document-scans'
import { HOUR, moment, type GuideDraft } from './people'

/** Cómo se llaman en el API los documentos de los datos de demo; primeros auxilios ya no se pide. */
const TYPE_OF: Partial<Record<SeedDocumentType, CredentialTypeCode>> = {
  cedula: 'cedula',
  'record-policia': 'record_policia',
  'carne-intur': 'licencia_intur',
  'certificado-idioma': 'certificado_idioma',
  'licencia-conducir': 'licencia_conducir',
  'seguro-vehiculo': 'seguro_vehiculo',
}

const SEED_TYPE_OF = Object.fromEntries(Object.entries(TYPE_OF).map(([seed, code]) => [code, seed])) as Record<CredentialTypeCode, SeedDocumentType>

function servicesOf(role: GuideDraft['seed']['serviceRole']): ServiceCode[] {
  if (role === 'both') return ['guia', 'traductor']
  return role === 'translator' ? ['traductor'] : ['guia']
}

function documentNumber(random: Random, type: CredentialTypeCode, issuedOn: ISODate): string {
  switch (type) {
    case 'cedula': {
      const [year, month, day] = issuedOn.split('-')
      return `${String(random.int(1, 616)).padStart(3, '0')}-${day}${month}${year.slice(2)}-${random.int(1000, 9999)}${'ABCDEFGHJKLMNPQRSTUVWXY'[random.int(0, 22)]}`
    }
    case 'record_policia':
      return `PN-${issuedOn.slice(0, 4)}-${random.int(100000, 999999)}`
    case 'licencia_intur':
      return `INTUR-GT-${random.int(1000, 9999)}`
    case 'certificado_idioma':
      return `CI-${random.int(10000, 99999)}`
    case 'licencia_conducir':
      return `LC-${random.int(1000000, 9999999)}`
    case 'seguro_vehiculo':
      return `POL-${random.int(100000, 999999)}`
  }
}

/** Cuándo se emitió y cuándo vence, según el tipo. */
function validity(random: Random, type: CredentialTypeCode, today: ISODate): { issuedOn: ISODate; expiresOn: ISODate | null } {
  const issued = (min: number, max: number) => addDays(today, -random.int(min, max))
  switch (type) {
    case 'cedula': {
      const issuedOn = issued(400, 2500)
      return { issuedOn, expiresOn: addDays(issuedOn, 3650) }
    }
    case 'record_policia':
      return { issuedOn: issued(8, 60), expiresOn: null }
    case 'licencia_intur': {
      const issuedOn = issued(90, 300)
      return { issuedOn, expiresOn: addDays(issuedOn, 730) }
    }
    case 'certificado_idioma':
      return { issuedOn: issued(200, 900), expiresOn: null }
    case 'licencia_conducir': {
      const issuedOn = issued(300, 1200)
      return { issuedOn, expiresOn: addDays(issuedOn, 1825) }
    }
    case 'seguro_vehiculo': {
      const issuedOn = issued(20, 200)
      return { issuedOn, expiresOn: addDays(issuedOn, 365) }
    }
  }
}

const SCAN_TEXT: Partial<Record<CredentialTypeCode, (name: string, city: string) => string>> = {
  record_policia: (name) => `Se hace constar que ${name} no registra antecedentes policiales a la fecha de emisión de esta constancia.`,
  certificado_idioma: (name) => `Se certifica que ${name} acreditó sus niveles de idiomas según el Marco Común Europeo.`,
  seguro_vehiculo: (name, city) => `Póliza vigente de responsabilidad civil y cobertura de pasajeros a nombre de ${name}, para el vehículo registrado en ${city}.`,
}

function buildProvider(draft: GuideDraft, today: ISODate): MockProvider {
  const { seed } = draft
  const random = createRandom(hashSeed(`kplan-provider:${draft.id}`))
  const services = servicesOf(seed.serviceRole)
  const asked = requiredTypes(services, seed.hasTransport)
  const at = (daysAgo: number, minutes: number) => toInstant(moment(today, daysAgo, minutes))
  const submittedAt = at(seed.submittedDaysAgo, seed.submittedDaysAgo === 0 ? 7 * HOUR + random.int(0, 50) : random.int(8, 19) * HOUR + random.int(0, 59))
  const settledAt = at(seed.stageDaysAgo, seed.stageDaysAgo === 0 ? 7 * HOUR + random.int(20, 55) : random.int(9, 17) * HOUR + random.int(0, 59))
  const open = seed.status === 'in_review'

  const current: MockProviderRequest = {
    id: `${draft.id}-r2`,
    procedure: 'application',
    status: open ? (seed.assigneeId ? 'in_review' : 'submitted') : seed.status === 'approved' ? 'approved' : 'rejected',
    submittedAt: seed.correction ? settledAt : submittedAt,
    resolvedAt: open ? null : settledAt,
    takenById: open ? seed.assigneeId : (seed.assigneeId ?? 'user-daniela'),
    resolution: null,
  }
  const previous: MockProviderRequest | null = seed.correction
    ? {
        id: `${draft.id}-r1`,
        procedure: 'application',
        status: 'rejected',
        submittedAt,
        resolvedAt: at(seed.correction.requestedDaysAgo, 11 * HOUR + 20),
        takenById: seed.assigneeId ?? 'user-daniela',
        resolution: {
          approved: false,
          reasonCode: CHANGES_REQUESTED.code,
          note: seed.correction.note,
          resolvedAt: at(seed.correction.requestedDaysAgo, 11 * HOUR + 20),
        },
      }
    : null

  const credentials: MockCredential[] = []
  const credential = (type: CredentialTypeCode, requestId: string, uploadedAt: string, verdict: MockCredential['verdict'], status: MockCredential['status']) => {
    const { issuedOn, expiresOn } = validity(random, type, today)
    const number = documentNumber(random, type, issuedOn)
    const note = verdict === 'rejected' ? (seed.notes[SEED_TYPE_OF[type]] ?? '') : ''
    const info = asked.find((item) => item.code === type)
    credentials.push({
      id: `${requestId}-${type}`,
      type,
      number,
      issuedOn,
      expiresOn,
      fileUrl: info
        ? documentScans({ info: info.scan, name: draft.name, city: draft.city, number, issuedOn, expiresOn, body: SCAN_TEXT[type]?.(draft.name, draft.city) ?? '' })[0].url
        : '',
      status,
      verdict,
      reviewedAt: verdict ? uploadedAt : null,
      reasonCode: verdict === 'rejected' ? (note ? 'otro' : 'documento_ilegible') : null,
      note,
      requestId,
      uploadedAt,
    })
  }

  for (const type of asked) {
    const corrected = seed.correction && TYPE_OF[seed.correction.document] === type.code
    if (previous && corrected) credential(type.code, previous.id, submittedAt, 'rejected', 'rejected')
    const requestId = previous && !corrected ? previous.id : current.id
    const uploadedAt = requestId === current.id ? current.submittedAt : submittedAt

    if (seed.status === 'approved') {
      credential(type.code, requestId, uploadedAt, 'accepted', 'approved')
      continue
    }
    const seedStatus = seed.documents[SEED_TYPE_OF[type.code]]
    // Lo que el expediente ya pasó (antecedentes o decisión en el modelo anterior) está aceptado.
    const accepted = seed.stage !== 'documents' || seedStatus === 'accepted'
    if (!accepted && seedStatus === undefined) continue
    if (accepted) credential(type.code, requestId, uploadedAt, 'accepted', open && seed.assigneeId ? 'in_review' : 'uploaded')
    else if (seedStatus === 'rejected') credential(type.code, requestId, uploadedAt, 'rejected', open ? 'in_review' : 'rejected')
    else credential(type.code, requestId, uploadedAt, null, open && seed.assigneeId ? 'in_review' : 'uploaded')
  }

  if (!open) {
    current.resolution = {
      approved: seed.status === 'approved',
      reasonCode: seed.status === 'approved' ? null : seed.status === 'changes_requested' ? CHANGES_REQUESTED.code : 'antecedentes_no_favorables',
      note:
        seed.status === 'changes_requested'
          ? credentials
              .filter((item) => item.verdict === 'rejected' && item.requestId === current.id)
              .map((item) => item.note)
              .join(' ')
          : (seed.decisionNote ?? ''),
      resolvedAt: settledAt,
    }
  }

  return {
    id: `provider-${draft.id.replace(/^app-/, '')}`,
    userId: draft.userId,
    name: draft.name,
    email: draft.email,
    phone: draft.phone || '+505 8800 0000',
    cityId: cityByName(draft.city)?.id ?? null,
    services,
    presentation: seed.bio,
    photoUrl: draft.photoUrl,
    languages: seed.languages.map((name) => {
      const code = LANGUAGES.find((item) => item.label === name)?.code ?? 'es'
      return { code, level: (code === 'es' ? 'native' : 'advanced') as LanguageLevel }
    }),
    carriesTourists: seed.hasTransport,
    status: open ? 'in_review' : seed.status === 'approved' ? 'active' : 'unaccredited',
    createdAt: submittedAt,
    approvedAt: seed.status === 'approved' ? settledAt : null,
    requests: previous ? [previous, current] : [current],
    credentials,
  }
}

export function seedProviders(guides: GuideDraft[], today: ISODate): MockProvider[] {
  return guides.map((draft) => buildProvider(draft, today))
}
