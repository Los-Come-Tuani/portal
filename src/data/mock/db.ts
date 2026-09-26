import { todayISO, type ISODate, type LocalDateTime } from '@/lib/dates'
import type {
  BadgeActivation,
  BadgeCampaign,
  Circuit,
  CircuitGroupSession,
  Coupon,
  CouponRedemption,
  EventItem,
  GuideApplication,
  Organization,
  OrganizationApplication,
  PlaceProfile,
  Post,
  Pricing,
  StaffRole,
  Stop,
  User,
} from '../models'
import { SCHEMA_VERSION, seedDatabase } from './seed'

const STORAGE_KEY = 'kplan.portal.demo'

export interface Payment {
  statementId: string
  paidAt: LocalDateTime
}

/** Todo lo que guarda el backend de demo, persistido en localStorage. */
export interface MockDatabase {
  version: number
  seededOn: ISODate
  users: User[]
  staffRoles: StaffRole[]
  guideApplications: GuideApplication[]
  organizationApplications: OrganizationApplication[]
  organizations: Organization[]
  stops: Stop[]
  circuits: Circuit[]
  groupSessions: CircuitGroupSession[]
  profiles: PlaceProfile[]
  posts: Post[]
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
