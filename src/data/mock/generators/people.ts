/**
 * Las personas de la demo, relativas al día en que se siembra: el equipo y
 * las organizaciones (users.json), los guías de la app ya verificados, los
 * guías que esperan verificación (guide_applications.json) y turistas.
 */
import { addDays, nowMinutes, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import { createRandom, hashSeed, type Random } from '@/lib/random'
import { slugify } from '@/lib/slug'
import { CITIES, type User } from '../../models'
import { catalog, type AppGuide, type ApplicationSeed } from '../catalog'

/** guides.json de la app no trae ciudad. */
const APP_GUIDE_CITIES: Record<string, string> = {
  'guide-marlene': 'Granada',
  'guide-esteban': 'León',
  'guide-fatima': 'León',
  'guide-oscar': 'Masaya',
  'guide-valeria': 'Masaya',
  'guide-ramon': 'León',
  'guide-translator-hans': 'Granada',
  'guide-translator-noemi': 'Granada',
}

export const HOUR = 60

/** Hoy, nunca después de la hora en que se siembra la demo. */
export function moment(today: ISODate, daysAgo: number, minutes: number): LocalDateTime {
  const clamped = daysAgo === 0 ? Math.max(0, Math.min(minutes, nowMinutes() - 15)) : minutes
  return toLocalDateTime(addDays(today, -daysAgo), clamped)
}

function emailFor(name: string, index = 0): string {
  const [first, ...rest] = slugify(name).split('-')
  return `${first}.${rest.at(-1) ?? 'kplan'}${index > 0 ? index : ''}@correo.demo`
}

function phone(random: Random): string {
  return `+505 8${random.int(100, 999)} ${random.int(1000, 9999)}`
}

/** Un guía o traductor de la demo: su cuenta y lo que mandó para que lo verifiquen. */
export interface GuideDraft {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  city: string
  photoUrl: string
  seed: ApplicationSeed
}

/** Los guías de la app ya pasaron la verificación hace meses. */
function approvedSeed(guide: AppGuide, index: number): ApplicationSeed {
  return {
    id: `app-${guide.id}`,
    name: guide.name,
    city: APP_GUIDE_CITIES[guide.id] ?? 'Granada',
    phone: '',
    serviceRole: guide.role,
    languages: guide.languages,
    specialties: guide.specialties,
    yearsExperience: guide.yearsExperience,
    hasTransport: guide.hasTransport,
    bio: guide.bio,
    references: [],
    submittedDaysAgo: 110 + index * 9,
    stageDaysAgo: 104 + index * 9,
    stage: 'decision',
    status: 'approved',
    assigneeId: index % 2 === 0 ? 'user-raquel' : 'user-daniela',
    documents: {},
    checks: {},
    notes: {},
  }
}

export function seedPeople(today: ISODate): { users: User[]; guides: GuideDraft[] } {
  const random = createRandom(hashSeed(`kplan-people:${today}`))

  const portalUsers: User[] = catalog.users.map(({ createdDaysAgo, seenDaysAgo, ...user }) => ({
    ...user,
    serviceRole: null,
    createdAt: addDays(today, -createdDaysAgo),
    lastSeenAt: seenDaysAgo === null ? null : moment(today, seenDaysAgo, random.int(8, 17) * HOUR + random.int(0, 59)),
  }))

  const guides: GuideDraft[] = [
    ...catalog.appGuides.map((guide, index) => {
      const seed = approvedSeed(guide, index)
      return {
        id: seed.id,
        userId: `user-${guide.id}`,
        name: guide.name,
        email: emailFor(guide.name),
        phone: phone(random),
        city: seed.city,
        photoUrl: guide.photoUrl,
        seed,
      }
    }),
    ...catalog.guideApplications.map((seed) => ({
      id: seed.id,
      userId: `user-${seed.id.replace(/^app-/, '')}`,
      name: seed.name,
      email: emailFor(seed.name),
      phone: seed.phone,
      city: seed.city,
      photoUrl: `https://picsum.photos/seed/${seed.id}/300/300`,
      seed,
    })),
  ]

  const guideUsers: User[] = guides.map((draft) => ({
    id: draft.userId,
    name: draft.name,
    email: draft.email,
    role: 'guia',
    organizationId: null,
    staffRoleId: null,
    serviceRole: draft.seed.serviceRole,
    status: 'active',
    phone: draft.phone,
    city: draft.city,
    createdAt: addDays(today, -(draft.seed.submittedDaysAgo + 1)),
    lastSeenAt: moment(today, random.int(0, 6), random.int(7, 20) * HOUR + random.int(0, 59)),
  }))

  return { users: [...portalUsers, ...guideUsers, ...seedTourists(today)], guides }
}

const TOURIST_FIRST = [
  'María', 'José', 'Andrea', 'Carlos', 'Sofía', 'Luis', 'Valeria', 'Diego', 'Emily', 'John', 'Sarah', 'Lukas',
  'Camille', 'Marco', 'Hannah', 'Pedro', 'Fernanda', 'Kevin', 'Laura', 'Tomás', 'Chloé', 'Matteo', 'Olivia', 'Noah',
]
const TOURIST_LAST = [
  'González', 'Hernández', 'López', 'Martínez', 'Rodríguez', 'Morales', 'Castro', 'Vega', 'Smith', 'Johnson',
  'Müller', 'Dubois', 'Rossi', 'Brown', 'Silva', 'Reyes', 'Navarro', 'Weber', 'Taylor', 'Mora',
]

function seedTourists(today: ISODate): User[] {
  const random = createRandom(hashSeed(`kplan-tourists:${today}`))
  const used = new Map<string, number>()
  return Array.from({ length: 48 }, (_, index) => {
    const name = `${random.pick(TOURIST_FIRST)} ${random.pick(TOURIST_LAST)}`
    const count = used.get(name) ?? 0
    used.set(name, count + 1)
    const createdDaysAgo = random.int(1, 200)
    return {
      id: `user-turista-${index + 1}`,
      name,
      email: emailFor(name, count),
      role: 'turista' as const,
      organizationId: null,
      staffRoleId: null,
      serviceRole: null,
      status: index === 7 || index === 31 ? ('suspended' as const) : ('active' as const),
      phone: random.chance(0.6) ? phone(random) : '',
      city: random.pick(CITIES).name,
      createdAt: addDays(today, -createdDaysAgo),
      lastSeenAt: moment(today, random.int(0, Math.min(createdDaysAgo, 45)), random.int(7, 21) * HOUR + random.int(0, 59)),
    }
  })
}
