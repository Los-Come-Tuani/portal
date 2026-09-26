import type { TagTone } from '@/components/ui'
import type { CheckStatus } from '@/data/models'

export const CHECK_STATUS_TONES: Record<CheckStatus, TagTone> = {
  pending: 'planned',
  clear: 'confirmed',
  flagged: 'danger',
}
