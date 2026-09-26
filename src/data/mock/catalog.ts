/**
 * Los JSON de la demo, tipados. `stops`, `circuits`, `circuit_groups`,
 * `events` y `coupons` son copia de mobile/assets/mock; los demás son
 * propios del portal. `daysFromNow` / `daysAgo` sólo existen en el mock.
 */
import type {
  Circuit,
  CircuitGroupSession,
  Coupon,
  EventItem,
  LatLng,
  Organization,
  PlaceProfile,
  Post,
  Stop,
  User,
} from '../models'
import circuitsJson from './json/circuits.json'
import groupSessionsJson from './json/circuit_groups.json'
import appCouponsJson from './json/coupons.json'
import appEventsJson from './json/events.json'
import organizationsJson from './json/organizations.json'
import profilesJson from './json/place_profiles.json'
import portalCouponsJson from './json/portal_coupons.json'
import portalEventsJson from './json/portal_events.json'
import portalStopsJson from './json/portal_stops.json'
import postsJson from './json/posts.json'
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

export type PortalCouponSeed = Omit<Coupon, 'validUntil' | 'createdAt'> & { validDays: number; daysAgo: number }
export type PostSeed = Omit<Post, 'publishedAt'> & { daysAgo: number }
export type ProfileSeed = Omit<PlaceProfile, 'updatedAt'>

export const catalog = {
  stops: [...stopsJson, ...portalStopsJson] as Stop[],
  circuits: circuitsJson as Circuit[],
  groupSessions: groupSessionsJson as CircuitGroupSession[],
  appEvents: appEventsJson as AppEvent[],
  appCoupons: appCouponsJson as AppCoupon[],
  organizations: organizationsJson as Organization[],
  users: usersJson as User[],
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
