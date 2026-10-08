/**
 * Los lugares en el backend de demo con el formato y las reglas del API (docs/territorio.md del
 * repo del API): quién ve y quién edita cada lugar, y cómo se escribe uno en `snake_case`.
 */
import type { LocalDateTime } from '@/lib/dates'
import { slugify } from '@/lib/slug'
import { clockToInput, parseDuration } from '@/lib/time'
import { PILLAR_CODES, type Organization, type User } from '../../models'
import type { MockDatabase, MockStop } from '../db'
import { fail, MockHttpError } from '../http'
import { hasPermission, isAdmin } from './access'
import { cityByName } from './application-catalog'
import { ownerOf } from './ownership'

const EXTERNAL_PREFIX = 'https://'

/** Una imagen de ejemplo es una dirección pública; una subida en la demo vive en `files`. */
export function wirePhoto(db: MockDatabase, key: string) {
  return { key, url: key.startsWith(EXTERNAL_PREFIX) ? key : (db.files[key] ?? null) }
}

/** Las claves nuevas tienen que ser archivos ya subidos; las que el objeto ya tiene pasan. */
export function checkPhotos(db: MockDatabase, keys: readonly string[], current: readonly string[], field: string): string[] {
  if (new Set(keys).size !== keys.length) throw fail.invalid('Revisa los campos marcados', { [field]: 'Hay una foto repetida.' })
  for (const key of keys) {
    if (!current.includes(key) && !key.startsWith(EXTERNAL_PREFIX) && !db.files[key]) {
      throw fail.invalid('Revisa los campos marcados', { [field]: 'No encontramos ese archivo. Súbelo de nuevo.' })
    }
  }
  return [...keys]
}

export function wireCity(name: string) {
  const city = cityByName(name)
  return city ? { id: city.id, code: city.code, name: city.name } : { id: `city-${slugify(name)}`, code: slugify(name), name }
}

/** Una hora de la demo (`LocalDateTime` de Managua) como la escribe el API. */
export const wireInstant = (value: LocalDateTime) => `${value.slice(0, 19)}-06:00`

const ownerKind = (organization: Organization) => (organization.type === 'negocio' ? 'business' : 'municipality')

export function wireStop(db: MockDatabase, stop: MockStop) {
  const owner = ownerOf(db, stop.id)
  return {
    id: stop.id,
    name: stop.name,
    pillar: { code: PILLAR_CODES[stop.category], label: stop.category },
    city: wireCity(stop.city),
    address: stop.address,
    description: stop.description,
    tip: stop.tip,
    latitude: stop.coordinates.latitude,
    longitude: stop.coordinates.longitude,
    opens_at: clockToInput(stop.opensAt) || null,
    closes_at: clockToInput(stop.closesAt) || null,
    visit_minutes: parseDuration(stop.duration) || 30,
    has_badge: stop.hasBadge,
    rating: stop.rating,
    reviews_count: stop.reviewsCount,
    images: stop.images.map((key) => wirePhoto(db, key)),
    owner: owner ? { kind: ownerKind(owner), id: owner.id, name: owner.name } : null,
  }
}

export const isActive = (stop: MockStop) => !stop.draft && !stop.retired

/** En cuántos circuitos publicados está: así no se retira un lugar que la app está recorriendo. */
export function publishedCircuitsOf(db: MockDatabase, stopId: string): number {
  return db.circuits.filter((circuit) => !circuit.draft && circuit.stopIds.includes(stopId)).length
}

export function wirePlace(db: MockDatabase, stop: MockStop) {
  return {
    ...wireStop(db, stop),
    active: isActive(stop),
    created_at: `${db.seededOn}T12:00:00Z`,
    published_circuits: publishedCircuitsOf(db, stop.id),
  }
}

/** La organización verificada de quien entró; una en revisión no administra nada. */
export function actorOrganization(db: MockDatabase, user: User): Organization | null {
  if (isAdmin(user)) return null
  return db.organizations.find((item) => item.id === user.organizationId && item.status === 'active') ?? null
}

/** El equipo con `places.view` ve todos; una organización verificada, los suyos. */
export function visibleStops(db: MockDatabase, user: User): MockStop[] {
  if (hasPermission(db, user, ['places.view'])) return db.stops
  const organization = actorOrganization(db, user)
  if (!organization) throw fail.forbidden()
  return db.stops.filter((stop) => organization.stopIds.includes(stop.id))
}

/** Un lugar de otra organización no existe para quien pregunta (404, no 403). */
export function visibleStop(db: MockDatabase, user: User, stopId: string): MockStop {
  const stop = visibleStops(db, user).find((item) => item.id === stopId)
  if (!stop) throw fail.notFound('No encontramos ese lugar.')
  return stop
}

/** Edita la ficha el equipo con `places.manage` o su dueño. */
export function editableStop(db: MockDatabase, user: User, stopId: string): MockStop {
  const stop = visibleStop(db, user, stopId)
  if (hasPermission(db, user, ['places.manage'])) return stop
  const organization = actorOrganization(db, user)
  if (organization && organization.stopIds.includes(stop.id)) return stop
  throw fail.forbidden()
}

/** Retirarlo (o devolverlo) es del equipo o de la alcaldía dueña; un comercio no retira su lugar. */
export function assertCanRetire(db: MockDatabase, user: User, stop: MockStop): void {
  const owner = ownerOf(db, stop.id)
  if (!hasPermission(db, user, ['places.manage']) && owner?.type !== 'alcaldia') throw fail.forbidden()
}

export function assertNotInPublishedCircuits(db: MockDatabase, stop: MockStop): void {
  if (publishedCircuitsOf(db, stop.id) > 0) {
    throw new MockHttpError(409, 'Ese lugar está en circuitos publicados: quítalo de ellos antes de retirarlo.')
  }
}
