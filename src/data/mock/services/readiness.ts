import type { PlaceReadiness, Stop } from '../../models'
import type { MockDatabase } from '../db'

/** Lo mínimo para publicar un lugar nuevo: una foto y un pin que no sea el de otro lugar. */
export function readinessOf(db: MockDatabase, stop: Stop): PlaceReadiness {
  const { latitude, longitude } = stop.coordinates
  return {
    photos: stop.images.length,
    ownPin: !db.stops.some((item) => item.id !== stop.id && item.coordinates.latitude === latitude && item.coordinates.longitude === longitude),
  }
}