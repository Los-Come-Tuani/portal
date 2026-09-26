import type { TagTone } from '@/components/ui'
import type { ApplicationStatus, CheckStatus, DocumentStatus } from '@/data/models'

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

export const CHECK_STATUS_TONES: Record<CheckStatus, TagTone> = {
  pending: 'planned',
  clear: 'confirmed',
  flagged: 'danger',
}
