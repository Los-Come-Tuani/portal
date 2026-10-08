import { addDays, toLocalDateTime, type ISODate } from '@/lib/dates'
import { CREATIVE_BONUS_BADGES, type Coupon, type Organization } from '../models'
import { catalog, type AppCircuit } from './catalog'
import type { MockCircuit, MockDatabase } from './db'
import { categoryCode, toWireClock, type MockEvent } from './services/agenda'
import { CODE_ALPHABET, type MockCampaign, type MockCouponCode } from './services/rewards'
import { generateRedemptions, seedActivations, seedCampaigns, seedPayments } from './generators/activity'
import { seedAdmissions, seedPlaceRequests } from './generators/admissions'
import { seedPeople } from './generators/people'
import { seedProviders } from './generators/providers'
import { seedApplications } from './services/applications'

/** Súbelo cuando cambie la forma de los datos: la demo se vuelve a sembrar. */
export const SCHEMA_VERSION = 13

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

/**
 * La agenda cultural con el formato del API: los eventos de la app y los de la demo. En el API sólo
 * programan las alcaldías (y las instituciones) o el equipo: lo que la demo traía de un comercio
 * queda como especial de K'Plan.
 */
function seedAgenda(today: ISODate, organizations: Organization[]): MockEvent[] {
  const createdAt = toLocalDateTime(addDays(today, -20), 9 * 60)
  const municipality = (organizationId: string | null) =>
    organizations.find((item) => item.id === organizationId && item.type === 'alcaldia')?.id ?? null
  const base = { description: '', venue: '', cancelled: false, cancellationReason: '', clonedFromId: null, createdAt, hiddenAt: null, hiddenReason: '' }
  const fromApp = catalog.appEvents.map(
    (event): MockEvent => ({
      ...base,
      id: event.id,
      name: event.title,
      description: event.description,
      category: categoryCode(event.category),
      city: event.location.split(',')[0].trim(),
      venue: event.address.split(',')[0].trim(),
      address: event.address,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      startDate: event.date,
      endDate: event.date,
      startTime: '18:00',
      endTime: '22:00',
      entryPrice: event.price,
      featured: APP_EVENT_ORGANIZERS[event.id]?.featured ?? false,
      organizerId: municipality(APP_EVENT_ORGANIZERS[event.id]?.organizerId ?? null),
      pointId: null,
      images: [...event.images],
    }),
  )
  const fromPortal = catalog.portalEvents.map(({ daysFromNow, city, featured, ...event }): MockEvent => {
    const date = addDays(today, daysFromNow)
    return {
      ...base,
      id: event.id,
      name: event.title,
      description: event.description,
      category: categoryCode(event.category),
      city,
      venue: event.address.split(',')[0].trim(),
      address: event.address,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      startDate: date,
      endDate: date,
      startTime: toWireClock(event.startTime, '10:00'),
      endTime: toWireClock(event.endTime, '12:00'),
      entryPrice: event.price,
      featured: featured ?? false,
      organizerId: municipality(event.organizerId),
      pointId: event.stopId,
      images: [`https://picsum.photos/seed/${event.id}/800/600`, `https://picsum.photos/seed/${event.id}-2/800/600`],
    }
  })
  return [...fromApp, ...fromPortal]
}

const DEMO_TOURISTS = ['Ana Pérez', 'Luis Martínez', 'Sofía Castillo', 'Daniel Rocha', 'Valeria Gómez', 'Marco Silva', 'Emma Johnson', 'Lucas Müller']

/** Del texto de la app (`"10% de descuento"`, `"Gratis"`) al tipo de beneficio del API. */
function benefitOf(label: string): { benefitType: string; benefitAmount: number | null } {
  const percent = /(\d+)\s*%/.exec(label)
  if (percent) return { benefitType: 'descuento_porcentaje', benefitAmount: Number(percent[1]) }
  const amount = /C\$\s*(\d+)/i.exec(label)
  if (amount) return { benefitType: 'descuento_monto', benefitAmount: Number(amount[1]) }
  if (/gratis/i.test(label)) return { benefitType: 'producto_gratis', benefitAmount: null }
  return { benefitType: 'regalo', benefitAmount: null }
}

/**
 * Las campañas de cupones de los comercios con el formato del API (los cupones de K'Plan de la app no
 * existen en el API) y unos cupones entregados: por usar, usados y vencidos.
 */
function seedRewards(today: ISODate, organizations: Organization[]): { campaigns: MockCampaign[]; couponCodes: MockCouponCode[] } {
  const businesses = new Set(organizations.filter((item) => item.type === 'negocio').map((item) => item.id))
  const campaigns = catalog.portalCoupons
    .filter((coupon) => coupon.organizationId && businesses.has(coupon.organizationId))
    .map(
      (coupon): MockCampaign => ({
        id: coupon.id,
        businessId: coupon.organizationId as string,
        title: coupon.title,
        description: coupon.description,
        terms: coupon.terms,
        ...benefitOf(coupon.discountLabel),
        costBadges: coupon.cost,
        stockTotal: coupon.maxRedemptions ?? 100,
        image: coupon.image || null,
        expiresAt: toLocalDateTime(addDays(today, coupon.validDays - coupon.daysAgo), 23 * 60 + 59),
        withdrawnAt: coupon.status === 'paused' ? toLocalDateTime(addDays(today, -2), 10 * 60) : null,
        withdrawnReason: '',
        createdAt: toLocalDateTime(addDays(today, -coupon.daysAgo), 9 * 60),
      }),
    )
  let serial = 0
  const code = () => {
    serial += 1
    return Array.from({ length: 8 }, (_, index) => CODE_ALPHABET[(serial * 7 + index * 13 + serial * index * 5) % CODE_ALPHABET.length]).join('')
  }
  const couponCodes = campaigns.flatMap((campaign, campaignIndex) =>
    Array.from({ length: 4 }, (_, index): MockCouponCode => {
      const daysAgo = index * 6 + campaignIndex
      const redeemedAt = toLocalDateTime(addDays(today, -daysAgo), 11 * 60 + index * 37)
      return {
        id: `${campaign.id}-cupon-${index + 1}`,
        code: code(),
        campaignId: campaign.id,
        touristName: DEMO_TOURISTS[(campaignIndex + index) % DEMO_TOURISTS.length],
        redeemedAt,
        // El primero sigue por usar; el segundo se usó; el último venció.
        consumedAt: index === 1 || index === 2 ? toLocalDateTime(addDays(today, -daysAgo), 13 * 60) : null,
        expiresAt: index === 3 ? toLocalDateTime(addDays(today, -1), 23 * 60 + 59) : toLocalDateTime(addDays(today, 30 - daysAgo), 23 * 60 + 59),
      }
    }),
  )
  return { campaigns, couponCodes }
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
    agenda: seedAgenda(today, admissions.organizations),
    ...seedRewards(today, admissions.organizations),
    coupons,
    redemptions: generateRedemptions(coupons, today, pricing),
    badgeActivations: seedActivations(today, pricing),
    badgeCampaigns: seedCampaigns(today, pricing),
    payments: seedPayments(catalog.organizations, today),
    pricing,
  }
}
