import type { TagTone } from '@/components/ui'
import type { RequestStatus } from '@/data/models'

export const REQUEST_STATUS_TONES: Record<RequestStatus, TagTone> = {
  submitted: 'outline',
  in_review: 'planned',
  approved: 'confirmed',
  rejected: 'danger',
}

/** Cuántos minutos lleva esperando algo que el API fechó (`2026-10-05T14:30:00Z`). */
export function waitedMinutes(since: string, nowMs: number = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(since)) / 60_000))
}
