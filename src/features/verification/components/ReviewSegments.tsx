import { cn } from '@/lib/cn'

export type Segment = { key: string; label: string; state: 'done' | 'pending' | 'problem' | 'missing' }

const STATE_CLASSES: Record<Segment['state'], string> = {
  done: 'bg-confirmed',
  pending: 'bg-planned/30',
  problem: 'bg-danger',
  missing: 'border border-dashed border-danger/60',
}

/** Un tramo por documento o verificación: verde aceptado, azul por revisar, rojo con problema. */
export function ReviewSegments({ segments, className }: { segments: Segment[]; className?: string }) {
  return (
    <span role="img" aria-label={segments.map((segment) => segment.label).join('; ')} className={cn('flex gap-1', className)}>
      {segments.map((segment) => (
        <span key={segment.key} title={segment.label} className={cn('h-1.5 min-w-3 flex-1 rounded-full', STATE_CLASSES[segment.state])} />
      ))}
    </span>
  )
}
