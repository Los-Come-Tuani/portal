import { Landmark, Sparkles } from 'lucide-react'
import { Tag } from '@/components/ui'
import { CIRCUIT_KIND_LABELS, type CircuitKind } from '@/data/models'

/** Los especiales en terracota, los creativos en el dorado de las medallas, los privados sin color. */
export function CircuitKindTag({ kind }: { kind: CircuitKind }) {
  if (kind === 'kplan') {
    return (
      <Tag tone="brand" icon={<Sparkles size={12} aria-hidden="true" />}>
        {CIRCUIT_KIND_LABELS.kplan}
      </Tag>
    )
  }
  if (kind === 'creative') {
    return (
      <Tag tone="badge" icon={<Landmark size={12} aria-hidden="true" />}>
        {CIRCUIT_KIND_LABELS.creative}
      </Tag>
    )
  }
  return <Tag tone="outline">{CIRCUIT_KIND_LABELS.private}</Tag>
}
