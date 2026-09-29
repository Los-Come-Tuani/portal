import { addDays, toLocalDateTime, type ISODate } from '@/lib/dates'
import { formatDayMonth } from '@/lib/format'
import { deriveCircuit } from '@/lib/circuits'
import { cityLocation, type Circuit, type Coupon, type EventItem, type Stop } from '../models'
import { catalog } from './catalog'
import type { MockDatabase } from './db'
import { generateRedemptions, seedActivations, seedCampaigns, seedPayments } from './generators/activity'
import { seedAdmissions, seedPlaceRequests } from './generators/admissions'
import { seedPeople } from './generators/people'

/** Súbelo cuando cambie la forma de los datos: la demo se vuelve a sembrar. */
export const SCHEMA_VERSION = 7

/** Tarifas de demo: el admin las cambia en "Tarifas". No son precios reales. */
const DEMO_PRICING = {
  couponFee: 20,
  badgeActivationMonthly: 450,
  badgePacks: [
    { id: 'pack-100', badges: 100, price: 1200 },
    { id: 'pack-250', badges: 250, price: 2750 },
    { id: 'pack-500', badges: 500, price: 5000 },
  ],
  assistedOnboardingFee: 1500,
}

/** Quién organiza cada evento que ya trae la app. */
const APP_EVENT_ORGANIZERS: Record<string, { organizerId: string | null; featured: boolean }> = {
  'gritería-2026': { organizerId: 'org-alcaldia-leon', featured: true },
  'hipica-granada': { organizerId: 'org-alcaldia-granada', featured: false },
  'festival-poesia': { organizerId: 'org-alcaldia-granada', featured: false },
  torovenado: { organizerId: 'org-alcaldia-masaya', featured: false },
}

function seedKplanCircuits(today: ISODate, stops: Stop[]): Circuit[] {
  return catalog.portalCircuits.map(({ seasonFromDays, seasonToDays, ...seed }) => ({
    ...seed,
    ...deriveCircuit({
      stops: seed.stopIds.map((id) => stops.find((stop) => stop.id === id) as Stop),
      travelMode: seed.travelMode,
      legMinutes: seed.legMinutes,
      kind: 'kplan',
      bonusBadges: seed.bonusBadges ?? 0,
      city: seed.city,
    }),
    ...(seasonFromDays !== undefined && seasonToDays !== undefined
      ? { availableFrom: addDays(today, seasonFromDays), availableUntil: addDays(today, seasonToDays) }
      : {}),
  }))
}

export function seedDatabase(today: ISODate): MockDatabase {
  const now = toLocalDateTime(today, 8 * 60)
  const pricing = { ...DEMO_PRICING, updatedAt: toLocalDateTime(addDays(today, -30), 9 * 60) }

  const coupons: Coupon[] = [
    ...catalog.appCoupons.map((coupon) => ({
      ...coupon,
      organizationId: null,
      stopId: null,
      status: 'active' as const,
      validUntil: null,
      maxRedemptions: null,
      terms: 'Muéstralo al reservar.',
      createdAt: '2026-03-01',
    })),
    ...catalog.portalCoupons.map(({ validDays, daysAgo, ...coupon }) => {
      const createdAt = addDays(today, -daysAgo)
      return { ...coupon, createdAt, validUntil: addDays(createdAt, validDays) }
    }),
  ]

  const events: EventItem[] = [
    ...catalog.appEvents.map((event) => ({
      ...event,
      organizerId: APP_EVENT_ORGANIZERS[event.id]?.organizerId ?? null,
      stopId: null,
      status: 'published' as const,
      featured: APP_EVENT_ORGANIZERS[event.id]?.featured ?? false,
    })),
    ...catalog.portalEvents.map(({ daysFromNow, city, featured, ...event }) => {
      const date = addDays(today, daysFromNow)
      const images = [`https://picsum.photos/seed/${event.id}/800/600`, `https://picsum.photos/seed/${event.id}-2/800/600`]
      return {
        ...event,
        date,
        dateLabel: formatDayMonth(date),
        location: cityLocation(city),
        image: images[0],
        images,
        status: 'published' as const,
        featured: featured ?? false,
      }
    }),
  ]

  const people = seedPeople(today)
  const admissions = seedAdmissions(today, people.users, structuredClone(catalog.organizations), structuredClone(catalog.stops))
  const placeRequests = seedPlaceRequests(today, admissions.organizations, admissions.stops)

  return {
    version: SCHEMA_VERSION,
    seededOn: today,
    users: admissions.users,
    staffRoles: structuredClone(catalog.staffRoles),
    guideApplications: people.guideApplications,
    organizationApplications: admissions.applications,
    placeRequests,
    organizations: admissions.organizations,
    stops: admissions.stops,
    circuits: [...structuredClone(catalog.circuits), ...seedKplanCircuits(today, admissions.stops)],
    groupSessions: [...structuredClone(catalog.groupSessions), ...structuredClone(catalog.portalGroupSessions)],
    profiles: catalog.profiles.map((profile) => ({ ...structuredClone(profile), updatedAt: now })),
    posts: catalog.posts.map(({ daysAgo, ...post }) => ({
      ...post,
      publishedAt: toLocalDateTime(addDays(today, -daysAgo), 10 * 60 + daysAgo * 7),
    })),
    events,
    coupons,
    redemptions: generateRedemptions(coupons, today, pricing),
    badgeActivations: seedActivations(today, pricing),
    badgeCampaigns: seedCampaigns(today, pricing),
    payments: seedPayments(catalog.organizations, today),
    pricing,
  }
}
