import { todayISO, type ISODate, type LocalDateTime } from '@/lib/dates'
import type {
  BadgeActivation,
  BadgeCampaign,
  Circuit,
  CircuitGroupSession,
  Coupon,
  CouponRedemption,
  EventItem,
  Organization,
  OrganizationApplication,
  PlaceProfile,
  PlaceRequest,
  PostStatus,
  Pricing,
  StaffRole,
  Stop,
  User,
} from '../models'
import type { MockApplication, MockFiles } from './services/applications'
import type { MockProvider } from './services/providers'
import { SCHEMA_VERSION, seedDatabase } from './seed'

const STORAGE_KEY = 'kplan.portal.demo'

export interface Payment {
  statementId: string
  paidAt: LocalDateTime
}

/** Un rol del equipo como lo guarda la demo: cuántas personas lo tienen se cuenta al leerlo. */
export type MockStaffRole = Omit<StaffRole, 'members' | 'requiresTwoFactor'> & { requiresTwoFactor?: boolean }

/**
 * Un lugar como lo guarda la demo: el formato de stops.json de la app. Su dueño sale de
 * `organizations[].stopIds` y lo demás del API (ciudad, circuitos publicados) se arma al leerlo.
 */
export type MockStop = Omit<Stop, 'images' | 'cityId' | 'active' | 'owner' | 'publishedCircuits'> & {
  /** Direcciones públicas o claves de lo que se subió en la demo (`files`). */
  images: string[]
  /** El lugar nuevo de un pedido o una solicitud sin aprobar: todavía no está en la app. */
  draft?: boolean
  /** Lo retiró su alcaldía o el equipo. */
  retired?: boolean
}

/** Una novedad como la guarda la demo: la foto es una dirección pública o una clave de `files`. */
export interface MockPost {
  id: string
  stopId: string
  title: string
  body: string
  image: string
  publishedAt: LocalDateTime
  status: PostStatus
}

/** Todo lo que guarda el backend de demo, persistido en localStorage. */
export interface MockDatabase {
  version: number
  seededOn: ISODate
  users: User[]
  staffRoles: MockStaffRole[]
  /** Los guías y traductores de F5: su perfil, sus documentos y sus expedientes. */
  providers: MockProvider[]
  /** El modelo de demo anterior a F3: revisión por documento y alta asistida. */
  organizationApplications: OrganizationApplication[]
  /** Los expedientes de verificación de F3: los que ve quien se postula. */
  applications: MockApplication[]
  /** Lo que se "subió" en el modo demo: la clave del archivo y su contenido. */
  files: MockFiles
  placeRequests: PlaceRequest[]
  organizations: Organization[]
  stops: MockStop[]
  circuits: Circuit[]
  groupSessions: CircuitGroupSession[]
  profiles: PlaceProfile[]
  posts: MockPost[]
  events: EventItem[]
  coupons: Coupon[]
  redemptions: CouponRedemption[]
  badgeActivations: BadgeActivation[]
  badgeCampaigns: BadgeCampaign[]
  payments: Payment[]
  pricing: Pricing
}

let database: MockDatabase | null = null

function read(): MockDatabase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockDatabase
    return parsed.version === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

export function getDatabase(): MockDatabase {
  if (database) return database
  const stored = read()
  database = stored ?? seedDatabase(todayISO())
  if (!stored) saveDatabase(database)
  return database
}

export function saveDatabase(value: MockDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Sin espacio o en modo privado: la demo sigue en memoria.
  }
}

export function resetDatabase(): MockDatabase {
  database = seedDatabase(todayISO())
  saveDatabase(database)
  return database
}
