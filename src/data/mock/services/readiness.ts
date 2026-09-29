import type { OrganizationApplication, PlaceReadiness, Stop } from '../../models'
import type { MockDatabase } from '../db'

/** Lo mínimo para publicar un lugar nuevo: una foto y un pin que no sea el de otro lugar. */
export function readinessOf(db: MockDatabase, stop: Stop): PlaceReadiness {
  const { latitude, longitude } = stop.coordinates
  return {
    photos: stop.images.length,
    ownPin: !db.stops.some((item) => item.id !== stop.id && item.coordinates.latitude === latitude && item.coordinates.longitude === longitude),
  }
}

/** La solicitud con lo que le falta a su lugar nuevo, mientras siga abierta. */
export function withNewPlaceReadiness(db: MockDatabase, application: OrganizationApplication): OrganizationApplication {
  const open = application.status === 'in_review' || application.status === 'changes_requested'
  const stop = open && application.newStopId ? db.stops.find((item) => item.id === application.newStopId) : undefined
  return stop ? { ...application, newPlaceReadiness: readinessOf(db, stop) } : application
}
