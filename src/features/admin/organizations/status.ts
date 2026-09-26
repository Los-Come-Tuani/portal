import type { TagTone } from '@/components/ui'
import type { OrganizationStatus } from '@/data/models'

export const ORGANIZATION_STATUS_TONES: Record<OrganizationStatus, TagTone> = {
  pending: 'neutral',
  active: 'confirmed',
  suspended: 'danger',
}
