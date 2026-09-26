import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { Panel, SkeletonRows } from '@/components/ui'
import type { Stop } from '@/data/models'
import { placeIssues } from '@/features/places/lib/completeness'

/** Lo que le falta a cada ficha, con un enlace directo a arreglarlo. */
export function PlaceNudges({ places, loading }: { places: readonly Stop[] | undefined; loading: boolean }) {
  const items = (places ?? []).flatMap((stop) => placeIssues(stop).map((issue) => ({ stop, issue })))
  const multiple = (places?.length ?? 0) > 1

  return (
    <Panel title="Tu ficha en la app" description="Lo que el turista ve antes de decidir si te agrega a su día.">
      {loading ? (
        <SkeletonRows rows={3} />
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-body text-ink">
          <CircleCheck size={18} className="text-confirmed" aria-hidden="true" />
          Todo al día. Tu ficha está completa.
        </p>
      ) : (
        <ul className="-my-2 divide-y divide-divider">
          {items.slice(0, 5).map(({ stop, issue }) => (
            <li key={`${stop.id}-${issue.id}`}>
              <Link
                to={issue.fix === 'badges' ? paths.badges : paths.place(stop.id)}
                className="group flex items-center gap-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  {multiple && <span className="block text-caption font-semibold text-muted">{stop.name}</span>}
                  <span className="block text-body text-ink">{issue.message}</span>
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
