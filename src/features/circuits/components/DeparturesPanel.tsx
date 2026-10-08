import { Bus, Lock, UsersRound } from 'lucide-react'
import { ErrorState, Panel, Skeleton, Tag } from '@/components/ui'
import type { Departure } from '@/data/models'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { formatRelativeDay, plural } from '@/lib/format'

interface DeparturesPanelProps {
  departures: { data?: Departure[]; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }
  published: boolean
}

/** Las salidas de guía las publican los guías aprobados desde la app; aquí sólo se ven. */
export function DeparturesPanel({ departures, published }: DeparturesPanelProps) {
  const { today } = useNow()
  const upcoming = (departures.data ?? []).filter((departure) => departure.date >= today)
  const booked = upcoming.reduce((sum, departure) => sum + departure.booked, 0)

  return (
    <Panel
      title="Salidas de guía"
      description={
        upcoming.length > 0
          ? `${plural(upcoming.length, 'salida próxima', 'salidas próximas')} con ${plural(booked, 'persona que reservó', 'personas que reservaron')}. Las publican los guías aprobados desde la app.`
          : 'Las publican los guías aprobados desde la app, con su cupo.'
      }
      bodyClassName="p-0"
    >
      {!published ? (
        <p className="p-5 text-body text-muted">Los guías publican salidas sólo en los circuitos que están en la app.</p>
      ) : departures.isPending ? (
        <Skeleton className="m-5 h-20" />
      ) : departures.isError ? (
        <ErrorState error={departures.error} onRetry={() => void departures.refetch()} className="py-8" />
      ) : upcoming.length === 0 ? (
        <p className="p-5 text-body text-muted">Todavía no hay salidas. Cuando un guía publique una, aparece aquí con sus reservas.</p>
      ) : (
        <ul className="divide-y divide-divider">
          {upcoming.map((departure) => {
            const full = departure.remaining === 0
            return (
              <li key={departure.id} className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <div>
                  <p className="text-body font-semibold text-ink first-letter:uppercase">{formatRelativeDay(departure.date, today)}</p>
                  <p className="text-small text-muted tabular-nums">{departure.startTime}</p>
                  <div className="mt-2.5">
                    <p className={cn('flex items-center gap-1.5 text-small font-semibold tabular-nums', full ? 'text-confirmed' : 'text-ink')}>
                      <UsersRound size={14} aria-hidden="true" />
                      {full ? 'Lleno' : `${departure.booked} de ${departure.capacity}`}
                    </p>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper"
                      role="meter"
                      aria-valuenow={departure.booked}
                      aria-valuemin={0}
                      aria-valuemax={departure.capacity}
                      aria-label={`Reservas: ${departure.booked} de ${departure.capacity}`}
                    >
                      <div
                        className={cn('h-full rounded-full', full ? 'bg-confirmed' : 'bg-planned')}
                        style={{ width: `${Math.min(100, (departure.booked / Math.max(1, departure.capacity)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-body text-ink">
                    {departure.guideName}
                    {departure.transportIncluded && (
                      <Tag tone="neutral" icon={<Bus size={12} aria-hidden="true" />}>
                        Con transporte
                      </Tag>
                    )}
                    {departure.exclusive && (
                      <Tag tone="outline" icon={<Lock size={12} aria-hidden="true" />}>
                        Privada: la toma la primera reserva
                      </Tag>
                    )}
                  </p>
                  {departure.note && <p className="mt-1 text-small text-muted">{departure.note}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
