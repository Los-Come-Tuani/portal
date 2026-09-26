import type { Stop } from '@/data/models'

export interface PlaceIssue {
  id: 'hours' | 'photos' | 'description' | 'tip' | 'badge'
  message: string
  /** Dónde se arregla. */
  fix: 'profile' | 'badges'
}

/** Lo que le falta a la ficha para verse completa y funcionar bien en la app. */
export function placeIssues(stop: Stop): PlaceIssue[] {
  const issues: PlaceIssue[] = []
  if (!stop.opensAt && stop.category === 'Gastronomía') {
    issues.push({
      id: 'hours',
      message: 'Falta el horario: la app no puede avisarle al turista si vas a estar abierto.',
      fix: 'profile',
    })
  }
  if (stop.images.length < 3) {
    issues.push({
      id: 'photos',
      message: `${stop.images.length === 1 ? 'Tiene 1 foto' : `Tiene ${stop.images.length} fotos`}: con 3 o más la ficha se ve mucho mejor.`,
      fix: 'profile',
    })
  }
  if (stop.description.trim().length < 120) {
    issues.push({ id: 'description', message: 'La descripción es corta: cuéntale al turista qué va a vivir.', fix: 'profile' })
  }
  if (!stop.tip.trim()) {
    issues.push({ id: 'tip', message: 'Agrega una recomendación para el visitante.', fix: 'profile' })
  }
  if (!stop.hasBadge) {
    issues.push({
      id: 'badge',
      message: 'No da insignia: los turistas que coleccionan insignias lo pasan por alto.',
      fix: 'badges',
    })
  }
  return issues
}

/** 0 a 1, para la barra de "ficha completa". */
export function completeness(stop: Stop): number {
  const checks = [
    stop.images.length >= 3,
    stop.description.trim().length >= 120,
    stop.tip.trim().length > 0,
    stop.category !== 'Gastronomía' || !!stop.opensAt,
    stop.hasBadge,
    stop.coordinates.latitude !== 0,
  ]
  return checks.filter(Boolean).length / checks.length
}
