import type { PlaceProfile, PlaceProfileInput, Stop, StopInput } from '@/data/models'

/** Lo editable de la ficha, tal como lo lee la app. */
export function stopToForm(stop: Stop): StopInput {
  return {
    name: stop.name,
    category: stop.category,
    address: stop.address,
    opensAt: stop.opensAt,
    closesAt: stop.closesAt,
    duration: stop.duration,
    description: stop.description,
    tip: stop.tip,
    images: stop.images.map((photo) => ({ ...photo })),
    coordinates: { ...stop.coordinates },
  }
}

export function profileToForm(profile: PlaceProfile): PlaceProfileInput {
  return {
    offerings: profile.offerings.map((offering) => ({ ...offering })),
    amenities: [...profile.amenities],
    languages: [...profile.languages],
    contact: { ...profile.contact },
  }
}

export function newOfferingId(): string {
  return `of-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}
