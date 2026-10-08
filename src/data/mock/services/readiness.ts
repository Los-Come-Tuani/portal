import type { PlaceReadiness } from '../../models'
import type { MockDatabase, MockStop } from '../db'

/** Lo mínimo para publicar un lugar nuevo: una foto y un pin que no sea el de otro lugar. */
export function readinessOf(db: MockDatabase, stop: MockStop): PlaceReadiness {
  const { latitude, longitude } = stop.coordinates
  return {
    photos: stop.images.length,
    ownPin: !db.stops.some((item) => item.id !== stop.id && item.coordinates.latitude === latitude && item.coordinates.longitude === longitude),
  }
}