import type { Stop } from '../../models'
import type { MockDatabase } from '../db'
import { fail } from '../http'

export function ownerOf(db: MockDatabase, stopId: string) {
  return db.organizations.find((item) => item.stopIds.includes(stopId))
}

/** Un lugar sin dueño que ya pidió alguien: con un pedido de lugar o en una solicitud abierta. */
export function isClaimed(db: MockDatabase, stopId: string, exceptOrganizationId: string | null = null) {
  return (
    db.placeRequests.some(
      (item) => item.status === 'pending' && item.kind === 'claim' && item.stopId === stopId && item.organizationId !== exceptOrganizationId,
    ) ||
    db.organizationApplications.some(
      (item) =>
        (item.status === 'in_review' || item.status === 'changes_requested') &&
        item.claimedStopIds.includes(stopId) &&
        item.organizationId !== exceptOrganizationId,
    )
  )
}

/** Que el lugar exista, esté en la ciudad, no tenga dueño y nadie más lo haya pedido. */
export function assertStopFree(
  db: MockDatabase,
  stopId: string,
  { organizationId = null, city, field }: { organizationId?: string | null; city?: string; field: string },
): Stop {
  const invalid = (message: string) => fail.invalid('Revisa los lugares', { [field]: message })
  const stop = db.stops.find((item) => item.id === stopId && !item.draft)
  if (!stop) throw invalid('Uno de los lugares ya no está en la app')
  if (city && stop.city !== city) throw invalid(`${stop.name} no está en ${city}`)
  const owner = ownerOf(db, stopId)
  if (owner && owner.id !== organizationId) throw invalid(`${stop.name} ya lo administra ${owner.name}`)
  if (isClaimed(db, stopId, organizationId)) throw invalid(`Otra organización ya pidió ${stop.name}: el equipo lo está revisando`)
  return stop
}
