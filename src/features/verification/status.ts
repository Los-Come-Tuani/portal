import type { TagTone } from '@/components/ui'
import type { ApplicationStatus, DocumentStatus } from '@/data/models'
import { minutesBetween, type LocalDateTime } from '@/lib/dates'
import type { StepState } from './components/StageTrack'

export const APPLICATION_STATUS_TONES: Record<ApplicationStatus, TagTone> = {
  in_review: 'planned',
  changes_requested: 'neutral',
  approved: 'confirmed',
  rejected: 'danger',
}

export const DOCUMENT_STATUS_TONES: Record<DocumentStatus, TagTone> = {
  pending: 'planned',
  accepted: 'confirmed',
  rejected: 'danger',
}

/** Más de esto en una etapa ya es un retraso para quien espera. */
export const STAGE_LIMIT_MINUTES = 3 * 1440

/** El estado de cada etapa según dónde está la solicitud. */
export function stepState(index: number, currentIndex: number, status: ApplicationStatus): StepState {
  if (status === 'approved' || index < currentIndex) return 'done'
  if (index > currentIndex) return 'upcoming'
  if (status === 'rejected') return 'rejected'
  if (status === 'changes_requested') return 'waiting'
  return 'current'
}

export function waitingMinutes(stageSince: LocalDateTime, now: LocalDateTime): number {
  return Math.max(0, minutesBetween(stageSince, now))
}
