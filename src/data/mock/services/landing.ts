/**
 * Lo que alimenta la landing en el backend de demo, con el formato del API (docs/landing.md del repo
 * del API): las solicitudes de demo y las versiones de la app.
 */
import { addDays, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import { INSTALLERS, type DemoKind, type DemoStatus, type ReleasePlatform, type ReleaseStatus } from '../../models'
import type { MockDatabase } from '../db'
import { wireInstant } from './places'

export interface MockDemoRequest {
  id: string
  name: string
  email: string
  phone: string
  organization: string
  kind: DemoKind
  city: string
  message: string
  status: DemoStatus
  notes: string
  createdAt: LocalDateTime
  updatedAt: LocalDateTime | null
  updatedBy: string | null
}

export function wireDemoRequest(request: MockDemoRequest) {
  return {
    id: request.id,
    name: request.name,
    email: request.email,
    phone: request.phone,
    organization: request.organization,
    kind: request.kind,
    city: request.city,
    message: request.message,
    status: request.status,
    notes: request.notes,
    created_at: wireInstant(request.createdAt),
    updated_at: request.updatedAt ? wireInstant(request.updatedAt) : null,
    updated_by: request.updatedBy,
  }
}

/** Unas solicitudes de ejemplo: dos nuevas, una agendada y una realizada. */
export function seedDemoRequests(today: ISODate): MockDemoRequest[] {
  const at = (days: number, minutes: number) => toLocalDateTime(addDays(today, -days), minutes)
  const untouched = { notes: '', updatedAt: null, updatedBy: null, phone: '' }
  return [
    {
      ...untouched,
      id: 'demo-1',
      name: 'Lucía Martínez',
      email: 'lucia@cafesacuanjoche.example',
      phone: '+505 8888 0000',
      organization: 'Café Sacuanjoche',
      kind: 'business',
      city: 'León',
      message: 'Queremos ver cómo se publican los cupones y cuánto cuesta la insignia del local.',
      status: 'new',
      createdAt: at(0, 9 * 60 + 20),
    },
    {
      ...untouched,
      id: 'demo-2',
      name: 'Carlos Téllez',
      email: 'ctellez@toursnicaragua.example',
      organization: 'Tours Nicaragua',
      kind: 'tour_operator',
      city: 'Granada',
      message: '¿Podemos llevar a nuestros grupos por los circuitos creativos?',
      status: 'new',
      createdAt: at(1, 16 * 60 + 5),
    },
    {
      id: 'demo-3',
      name: 'Marta Ruiz',
      email: 'turismo@alcaldiamasaya.example',
      phone: '+505 2522 0000',
      organization: 'Alcaldía de Masaya',
      kind: 'municipality',
      city: 'Masaya',
      message: 'Nos interesa publicar la agenda cultural de las fiestas patronales.',
      status: 'scheduled',
      notes: 'Videollamada el jueves a las 10 a.m. con la oficina de turismo.',
      createdAt: at(4, 11 * 60),
      updatedAt: at(3, 15 * 60),
      updatedBy: "Equipo de K'Plan",
    },
    {
      id: 'demo-4',
      name: 'Ernesto Gaitán',
      email: 'egaitan@museoleon.example',
      phone: '',
      organization: 'Museo de Leyendas y Tradiciones',
      kind: 'institution',
      city: 'León',
      message: '',
      status: 'done',
      notes: 'Les interesa el QR de insignias en la entrada. Mandan su solicitud desde /postular.',
      createdAt: at(12, 10 * 60),
      updatedAt: at(8, 17 * 60),
      updatedBy: "Equipo de K'Plan",
    },
  ]
}

export interface MockRelease {
  id: string
  platform: ReleasePlatform
  version: string
  notes: string
  status: ReleaseStatus
  fileKey: string
  size: number
  downloads: number
  createdAt: LocalDateTime
  createdBy: string
  publishedAt: LocalDateTime | null
  withdrawnAt: LocalDateTime | null
}

/** Como `current_releases` del API: la publicada más reciente de cada plataforma. */
export function currentReleaseIds(db: MockDatabase): Set<string> {
  const current = new Map<ReleasePlatform, MockRelease>()
  for (const release of db.releases) {
    if (release.status !== 'published' || !release.publishedAt) continue
    const best = current.get(release.platform)
    if (!best || (best.publishedAt ?? '') < release.publishedAt) current.set(release.platform, release)
  }
  return new Set([...current.values()].map((release) => release.id))
}

export function wireRelease(release: MockRelease, current: Set<string>) {
  return {
    id: release.id,
    platform: release.platform,
    version: release.version,
    notes: release.notes,
    status: release.status,
    current: current.has(release.id),
    file_name: `kplan-${release.version}${INSTALLERS[release.platform].extension}`,
    size: release.size,
    downloads: release.downloads,
    created_at: wireInstant(release.createdAt),
    created_by: release.createdBy,
    published_at: release.publishedAt ? wireInstant(release.publishedAt) : null,
    withdrawn_at: release.withdrawnAt ? wireInstant(release.withdrawnAt) : null,
  }
}

/** Dos APK publicados (el más nuevo es el vigente) y un borrador listo para probar. */
export function seedReleases(today: ISODate): MockRelease[] {
  const at = (days: number, minutes: number) => toLocalDateTime(addDays(today, -days), minutes)
  const team = "Equipo de K'Plan"
  return [
    {
      id: 'version-1',
      platform: 'android',
      version: '0.9.0',
      notes: 'Primera versión del piloto: circuitos, agenda y Mi circuito.',
      status: 'published',
      fileKey: 'app-installer/android/demo-0.9.0.apk',
      size: 48_300_000,
      downloads: 37,
      createdAt: at(20, 9 * 60),
      createdBy: team,
      publishedAt: at(20, 10 * 60),
      withdrawnAt: null,
    },
    {
      id: 'version-2',
      platform: 'android',
      version: '1.0.0',
      notes: 'Reservas con guía, chat y avisos. Inicio de sesión con Google.',
      status: 'published',
      fileKey: 'app-installer/android/demo-1.0.0.apk',
      size: 51_700_000,
      downloads: 112,
      createdAt: at(3, 9 * 60),
      createdBy: team,
      publishedAt: at(3, 11 * 60),
      withdrawnAt: null,
    },
    {
      id: 'version-3',
      platform: 'android',
      version: '1.1.0-beta.1',
      notes: 'Insignias por QR y cupones. Para probar antes de publicar.',
      status: 'draft',
      fileKey: 'app-installer/android/demo-1.1.0-beta.1.apk',
      size: 52_100_000,
      downloads: 0,
      createdAt: at(0, 8 * 60 + 30),
      createdBy: team,
      publishedAt: null,
      withdrawnAt: null,
    },
  ]
}
