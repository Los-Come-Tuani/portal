/**
 * Los JSON de la demo, tipados. `stops`, `circuits`, `circuit_groups`,
 * `events` y `coupons` son copia de mobile/assets/mock; los demás son
 * propios del portal. `daysFromNow` / `daysAgo` sólo existen en el mock.
 */
import type {
  BackgroundCheckType,
  Circuit,
  CircuitGroupSession,
  Coupon,
  DocumentStatus,
  DocumentType,
  EventItem,
  GuideApplication,
  GuideServiceRole,
  LatLng,
  NewPlace,
  Organization,
  OrganizationApplication,
  OrganizationDocumentType,
  PlaceProfile,
  Post,
  StaffRole,
  Stop,
  User,
} from '../models'
import circuitsJson from './json/circuits.json'
import groupSessionsJson from './json/circuit_groups.json'
import appCouponsJson from './json/coupons.json'
import appEventsJson from './json/events.json'
import guideApplicationsJson from './json/guide_applications.json'
import admissionsJson from './json/organization_applications.json'
import appGuidesJson from './json/guides.json'
import organizationsJson from './json/organizations.json'
import profilesJson from './json/place_profiles.json'
import portalCircuitGroupsJson from './json/portal_circuit_groups.json'
import portalCircuitsJson from './json/portal_circuits.json'
import portalCouponsJson from './json/portal_coupons.json'
import portalEventsJson from './json/portal_events.json'
import portalStopsJson from './json/portal_stops.json'
import postsJson from './json/posts.json'
import staffRolesJson from './json/staff_roles.json'
import stopsJson from './json/stops.json'
import usersJson from './json/users.json'

type AppEvent = Omit<EventItem, 'organizerId' | 'startTime' | 'endTime' | 'stopId' | 'status' | 'featured'>
type AppCoupon = Pick<Coupon, 'id' | 'title' | 'description' | 'discountLabel' | 'cost' | 'image'>

export interface PortalEventSeed {
  id: string
  title: string
  category: string
  daysFromNow: number
  startTime?: string
  endTime?: string
  organizerId: string | null
  stopId: string | null
  city: string
  address: string
  description: string
  price: number
  coordinates: LatLng
  featured?: boolean
}

/** Los especiales de K'Plan de la demo: lo calculado se arma al sembrar y la temporada va en días desde hoy. */
export type PortalCircuitSeed = Omit<
  Circuit,
  'duration' | 'durationShort' | 'badges' | 'badgesNote' | 'availableFrom' | 'availableUntil'
> & { seasonFromDays?: number; seasonToDays?: number }

export type PortalCouponSeed = Omit<Coupon, 'validUntil' | 'createdAt'> & { validDays: number; daysAgo: number }
export type PostSeed = Omit<Post, 'publishedAt'> & { daysAgo: number }
export type ProfileSeed = Omit<PlaceProfile, 'updatedAt'>

export type UserSeed = Omit<User, 'createdAt' | 'lastSeenAt' | 'serviceRole'> & {
  createdDaysAgo: number
  seenDaysAgo: number | null
}

/** Un perfil de mobile/assets/mock/guides.json. */
export interface AppGuide {
  id: string
  name: string
  photoUrl: string
  rating: number
  reviewsCount: number
  languages: string[]
  bio: string
  yearsExperience: number
  specialties: string[]
  role: GuideServiceRole
  hasTransport: boolean
}

export type ApplicationSeed = Pick<
  GuideApplication,
  | 'id'
  | 'name'
  | 'city'
  | 'phone'
  | 'serviceRole'
  | 'languages'
  | 'specialties'
  | 'yearsExperience'
  | 'hasTransport'
  | 'bio'
  | 'references'
  | 'stage'
  | 'status'
  | 'assigneeId'
> & {
  submittedDaysAgo: number
  stageDaysAgo: number
  documents: Partial<Record<DocumentType, DocumentStatus>>
  checks: Partial<Record<BackgroundCheckType, 'clear' | 'flagged'>>
  notes: Partial<Record<DocumentType | BackgroundCheckType, string>>
  /** Se le pidió corregir un documento y ya subió uno nuevo. */
  correction?: { requestedDaysAgo: number; document: DocumentType; note: string }
  decisionNote?: string
}

export type AdmissionSeed = Pick<
  OrganizationApplication,
  | 'id'
  | 'organizationId'
  | 'userId'
  | 'type'
  | 'name'
  | 'legalName'
  | 'ruc'
  | 'kind'
  | 'city'
  | 'address'
  | 'description'
  | 'representative'
  | 'claimedStopIds'
  | 'stage'
  | 'status'
  | 'assigneeId'
> & {
  newPlace: NewPlace | null
  /** Sin valor: se toma de `joinedAt` de la organización. */
  submittedDaysAgo?: number
  stageDaysAgo: number
  documents: Partial<Record<OrganizationDocumentType, DocumentStatus>>
  notes: Partial<Record<OrganizationDocumentType, string>>
  /** El equipo llenó la solicitud; `fee` 0 si no se cobra. */
  assisted?: { byId: string; fee: number }
}

export const catalog = {
  stops: [...stopsJson, ...portalStopsJson] as Stop[],
  circuits: circuitsJson as Circuit[],
  groupSessions: groupSessionsJson as CircuitGroupSession[],
  portalCircuits: portalCircuitsJson as PortalCircuitSeed[],
  portalGroupSessions: portalCircuitGroupsJson as CircuitGroupSession[],
  appEvents: appEventsJson as AppEvent[],
  appCoupons: appCouponsJson as AppCoupon[],
  organizations: organizationsJson as Organization[],
  users: usersJson as UserSeed[],
  staffRoles: staffRolesJson as Omit<StaffRole, 'members' | 'requiresTwoFactor'>[],
  appGuides: appGuidesJson as AppGuide[],
  guideApplications: guideApplicationsJson as ApplicationSeed[],
  admissions: admissionsJson as AdmissionSeed[],
  profiles: profilesJson as ProfileSeed[],
  posts: postsJson as PostSeed[],
  portalEvents: portalEventsJson as PortalEventSeed[],
  portalCoupons: portalCouponsJson as PortalCouponSeed[],
}

const stopIndex = new Map(catalog.stops.map((stop) => [stop.id, stop]))

export function catalogStop(stopId: string): Stop {
  const stop = stopIndex.get(stopId)
  if (!stop) throw new Error(`La parada ${stopId} no está en el catálogo`)
  return stop
}
