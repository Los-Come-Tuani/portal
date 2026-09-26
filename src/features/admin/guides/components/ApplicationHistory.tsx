import { Panel } from '@/components/ui'
import type { ReviewEvent, ReviewEventKind } from '@/data/models'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'

const DOT: Record<ReviewEventKind, string> = {
  submitted: 'bg-ink',
  resubmitted: 'bg-ink',
  assigned: 'border border-ink/40 bg-surface',
  document_accepted: 'bg-confirmed',
  check_clear: 'bg-confirmed',
  approved: 'bg-confirmed',
  document_rejected: 'bg-danger',
  check_flagged: 'bg-danger',
  changes_requested: 'bg-danger',
  rejected: 'bg-danger',
  stage: 'bg-planned',
}

/** Quién hizo qué y cuándo, lo más reciente arriba. */
export function ApplicationHistory({ history }: { history: readonly ReviewEvent[] }) {
  const events = [...history].reverse()
  return (
    <Panel title="Historial" description="Cada paso queda registrado con quién lo hizo.">
      <ol className="relative flex flex-col gap-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3.5px] before:w-px before:bg-divider">
        {events.map((event) => (
          <li key={event.id} className="relative pl-5">
            <span aria-hidden="true" className={cn('absolute top-1.5 left-0 size-2 rounded-full', DOT[event.kind])} />
            <p className="text-small text-ink">{event.text}</p>
            <p className="text-caption text-muted">
              {event.actorId === null ? `${event.actorName}, desde la app` : event.actorName} · {formatDateTime(event.at)}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
