import { addDays, toLocalDateTime, type ISODate } from '@/lib/dates'
import { formatDayMonth } from '@/lib/format'
import { cityLocation, CREATIVE_BONUS_BADGES, type Coupon, type EventItem, type Organization } from '../models'
import { catalog, type AppCircuit } from './catalog'
import type { MockCircuit, MockDatabase } from './db'
import { generateRedemptions, seedActivations, seedCampaigns, seedPayments } from './generators/activity'
import { seedAdmissions, seedPlaceRequests } from './generators/admissions'
import { seedPeople } from './generators/people'
import { seedProviders } from './generators/providers'
import { seedApplications } from './services/applications'

/** Súbelo cuando cambie la forma de los datos: la demo se vuelve a sembrar. */
export const SCHEMA_VERSION = 11

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

/** Los circuitos de la app y los especiales de la demo, con el estado y la alcaldía del API. */
function seedCircuits(today: ISODate, organizations: Organization[]): MockCircuit[] {
  const createdAt = toLocalDateTime(addDays(today, -90), 9 * 60)
  const common = (circuit: Omit<AppCircuit, 'duration' | 'durationShort' | 'badges' | 'badgesNote'>) => ({
    id: circuit.id,
    title: circuit.title,
    shortTitle: circuit.shortTitle,
    subtitle: circuit.subtitle,
    category: circuit.category,
    city: circuit.city,
    rating: circuit.rating,
    reviewsCount: circuit.reviewsCount,
    stopIds: [...circuit.stopIds],
    travelMode: circuit.travelMode,
    ...(circuit.legMinutes ? { legMinutes: { ...circuit.legMinutes } } : {}),
    difficulty: circuit.difficulty,
    priceAdult: circuit.priceAdult,
    priceChild: circuit.priceChild,
    description: circuit.description,
    images: [...circuit.images],
    recommendations: circuit.recommendations,
    meetingPoint: circuit.meetingPoint,
    location: { ...circuit.location },
    includes: circuit.includes,
    notes: circuit.notes,
    startTimes: [...circuit.startTimes],
    version: 1,
    createdAt,
  })
  const app = catalog.circuits.map((circuit): MockCircuit => {
    const organizer = circuit.isCreativeCircuit
      ? organizations.find((item) => item.type === 'alcaldia' && (item.name === circuit.organizer || item.city === circuit.city))
      : undefined
    return {
      ...common(circuit),
      kind: circuit.isCreativeCircuit ? 'creative' : 'private',
      status: 'published',
      organizerId: organizer?.id ?? null,
      bonusBadges: circuit.isCreativeCircuit ? CREATIVE_BONUS_BADGES : 0,
      bookingMode: circuit.isCreativeCircuit ? 'group' : 'private',
      availableFrom: null,
      availableUntil: null,
      publishedAt: createdAt,
    }
  })
  const specials = catalog.portalCircuits.map(({ seasonFromDays, seasonToDays, ...seed }): MockCircuit => {
    const seasonal = seasonFromDays !== undefined && seasonToDays !== undefined
    return {
      ...common(seed),
      kind: 'kplan',
      status: seed.draft ? 'draft' : 'published',
      organizerId: null,
      bonusBadges: seed.bonusBadges,
      bookingMode: seed.bookingMode,
      availableFrom: seasonal ? addDays(today, seasonFromDays) : null,
      availableUntil: seasonal ? addDays(today, seasonToDays) : null,
      publishedAt: seed.draft ? null : createdAt,
    }
  })
  return [...app, ...specials]
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
  const verification = seedApplications(admissions.applications, admissions.organizations, admissions.users)

  return {
    version: SCHEMA_VERSION,
    seededOn: today,
    users: admissions.users,
    staffRoles: structuredClone(catalog.staffRoles),
    providers: seedProviders(people.guides, today),
    organizationApplications: admissions.applications,
    applications: verification.applications,
    files: verification.files,
    placeRequests,
    organizations: admissions.organizations,
    stops: admissions.stops,
    circuits: seedCircuits(today, admissions.organizations),
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
