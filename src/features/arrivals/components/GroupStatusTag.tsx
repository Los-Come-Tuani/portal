import { QrCode } from 'lucide-react'
import { Tag } from '@/components/ui'
import { DROP_REASONS } from '@/data/models'
import { formatTime } from '@/lib/format'
import type { ArrivalGroup } from '../lib/agenda'

export function GroupStatusTag({ group }: { group: ArrivalGroup }) {
  switch (group.status) {
    case 'upcoming':
      return <Tag tone="planned">Por llegar</Tag>
    case 'arriving':
      return <Tag tone="brand">Llegando</Tag>
    case 'arrived':
      return (
        <Tag tone="confirmed" icon={<QrCode size={12} aria-hidden="true" />}>
          {group.checkedInAt !== null ? formatTime(group.checkedInAt) : 'Llegó'}
        </Tag>
      )
    case 'dropped':
      return (
        <span title={group.dropReason ? DROP_REASONS[group.dropReason] : undefined}>
          <Tag tone="danger">No llegó</Tag>
        </span>
      )
    case 'unconfirmed':
      return <Tag tone="neutral">Sin confirmar</Tag>
  }
}
