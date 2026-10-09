import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { InlineError, Panel, SkeletonRows } from '@/components/ui'
import { useVisitEvents } from '@/data/hooks/use-visits'
import type { Stop } from '@/data/models'
import { DROP_REASONS, type DropReason } from '@/data/models'
import { addDays } from '@/lib/dates'
import { plural } from '@/lib/format'

const WINDOW_DAYS = 30

/** Para el admin: los lugares donde más turistas dejan la parada, con su razón principal. */
export function TopDroppedPlaces({ stopIds, today, places }: { stopIds?: string[]; today: string; places: readonly Stop[] | undefined }) {
  const events = useVisitEvents({ stopIds, from: addDays(today, -(WINDOW_DAYS - 1)), to: today })

  const byStop = new Map<string, Map<DropReason, number>>()
  for (const event of events.data ?? []) {
    if (event.type !== 'stop_dropped') continue
    const reasons = byStop.get(event.stopId) ?? new Map<DropReason, number>()
    reasons.set(event.reason, (reasons.get(event.reason) ?? 0) + 1)
    byStop.set(event.stopId, reasons)
  }
  const ranked = [...byStop.entries()]
    .map(([stopId, reasons]) => {
      const total = [...reasons.values()].reduce((sum, count) => sum + count, 0)
      const [topReason] = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]
      return { stopId, total, topReason }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  return (
    <Panel title="Donde más los dejan" description={`Lugares con más abandonos en los últimos ${WINDOW_DAYS} días.`}>
      {events.isPending ? (
        <SkeletonRows rows={4} />
      ) : events.isError ? (
        <InlineError error={events.error} onRetry={() => void events.refetch()} />
      ) : ranked.length === 0 ? (
        <p className="text-body text-muted">Nadie dejó un lugar en este tiempo.</p>
      ) : (
        <ol className="-my-2 divide-y divide-divider">
          {ranked.map((item) => (
            <li key={item.stopId}>
              <Link to={paths.place(item.stopId)} className="group flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-ink">
                    {places?.find((stop) => stop.id === item.stopId)?.name ?? item.stopId}
                  </span>
                  <span className="block text-caption text-muted">Sobre todo: {DROP_REASONS[item.topReason]}</span>
                </span>
                <span className="text-small font-semibold text-ink tabular-nums">{plural(item.total, 'vez', 'veces')}</span>
                <ArrowRight size={16} aria-hidden="true" className="text-muted group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
