import { ApiError } from '@/data/api/errors'
import { isUnpublished, type Circuit, type CircuitInput } from '@/data/models'
import { circuitInputSchema } from '@/data/schemas/circuit.schema'

export type CircuitErrors = Partial<Record<keyof CircuitInput | string, string>>

/** 0,0 es "sin punto de encuentro", como en la app. */
export const NO_LOCATION = { latitude: 0, longitude: 0 }

export function hasLocation(location: CircuitInput['location']): boolean {
  return location.latitude !== 0 || location.longitude !== 0
}

/** Uno nuevo: el equipo elige el tipo y la ciudad; la alcaldía crea creativos de la suya. */
export function emptyCircuit(defaults: Pick<CircuitInput, 'kind' | 'cityId'>): CircuitInput {
  return {
    ...defaults,
    title: '',
    shortTitle: '',
    subtitle: '',
    category: 'Ciudad',
    difficulty: 'Fácil',
    stopIds: [],
    travelMode: 'walking',
    startTimes: ['9:00 a.m.'],
    priceAdult: 0,
    priceChild: 0,
    description: '',
    images: [],
    recommendations: '',
    meetingPoint: '',
    location: NO_LOCATION,
    includes: '',
    notes: '',
    bonusBadges: 3,
    bookingMode: 'private',
    availableFrom: null,
    availableUntil: null,
    draft: true,
  }
}

export function toCircuitInput(circuit: Circuit): CircuitInput {
  return {
    kind: circuit.kind,
    cityId: circuit.cityId,
    title: circuit.title,
    shortTitle: circuit.shortTitle,
    subtitle: circuit.subtitle,
    category: circuit.category,
    difficulty: circuit.difficulty,
    stopIds: [...circuit.stopIds],
    travelMode: circuit.travelMode,
    ...(circuit.legMinutes ? { legMinutes: { ...circuit.legMinutes } } : {}),
    ...(circuit.directions ? { directions: { ...circuit.directions } } : {}),
    startTimes: [...circuit.startTimes],
    priceAdult: circuit.priceAdult,
    priceChild: circuit.priceChild,
    description: circuit.description,
    images: circuit.images.map((photo) => ({ ...photo })),
    recommendations: circuit.recommendations,
    meetingPoint: circuit.meetingPoint,
    location: { ...circuit.location },
    includes: circuit.includes,
    notes: circuit.notes,
    bonusBadges: circuit.kind === 'kplan' ? circuit.bonusBadges : 3,
    bookingMode: circuit.bookingMode,
    availableFrom: circuit.availableFrom ?? null,
    availableUntil: circuit.availableUntil ?? null,
    draft: isUnpublished(circuit),
  }
}

/**
 * Los errores del formulario por campo: primero los de Zod, y si pasa, los del servidor. El equipo
 * tiene que elegir la ciudad; la alcaldía crea en la suya.
 */
export function validateCircuit(input: CircuitInput, { cityRequired }: { cityRequired: boolean }): { data: CircuitInput | null; errors: CircuitErrors } {
  const result = circuitInputSchema.safeParse(input)
  const errors: CircuitErrors = {}
  if (cityRequired && !input.cityId) errors.cityId = 'Elige la ciudad'
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (!(key in errors)) errors[key] = issue.message
    }
  }
  if (!result.success || Object.keys(errors).length > 0) return { data: null, errors }
  return { data: result.data as CircuitInput, errors: {} }
}

/** `startTimes.2` o `images.0` se pintan en su campo. */
export function serverErrors(error: unknown): CircuitErrors | null {
  if (!(error instanceof ApiError) || Object.keys(error.fieldErrors).length === 0) return null
  const errors: CircuitErrors = {}
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const key = field.split('.')[0]
    if (!(key in errors)) errors[key] = message
  }
  return errors
}
