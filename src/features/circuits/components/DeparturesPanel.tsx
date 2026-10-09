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

/**
 * Las salidas de guía las publican los guías aprobados desde la app; aquí sólo se ven, también las
 * canceladas y las de un circuito que ya no está en la app.
 */
export function DeparturesPanel({ departures, published }: DeparturesPanelProps) {
  const { today } = useNow()
  const upcoming = (departures.data ?? []).filter((departure) => departure.date >= today)
  const open = upcoming.filter((departure) => !departure.cancelled)
  const booked = open.reduce((sum, departure) => sum + departure.booked, 0)
  const cancelled = upcoming.length - open.length

  const summary =
    open.length > 0
      ? `${plural(open.length, 'salida próxima', 'salidas próximas')} con ${plural(booked, 'persona que reservó', 'personas que reservaron')}.`
      : cancelled > 0
        ? `${plural(cancelled, 'salida cancelada', 'salidas canceladas')}: sus reservas se cancelaron y se avisó a turistas y guías.`
        : ''

  return (
    <Panel
      title="Salidas de guía"
      description={
        summary
          ? `${summary} Las publican los guías aprobados desde la app.`
          : published
            ? 'Las publican los guías aprobados desde la app, con su cupo.'
            : 'Los guías publican salidas sólo en los circuitos que están en la app.'
      }
      bodyClassName="p-0"
    >
      {departures.isPending ? (
        <Skeleton className="m-5 h-20" />
      ) : departures.isError ? (
        <ErrorState error={departures.error} onRetry={() => void departures.refetch()} className="py-8" />
      ) : upcoming.length === 0 ? (
        <p className="p-5 text-body text-muted">
          {published
            ? 'Todavía no hay salidas. Cuando un guía publique una, aparece aquí con sus reservas.'
            : 'No tiene salidas próximas. Al publicarlo, los guías pueden volver a ofrecerlo.'}
        </p>
      ) : (
        <ul className="divide-y divide-divider">
          {upcoming.map((departure) => {
            const full = !departure.cancelled && departure.remaining === 0
            return (
              <li
                key={departure.id}
                className={cn('grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]', departure.cancelled && 'bg-canvas/60')}
              >
                <div>
                  <p className={cn('text-body font-semibold first-letter:uppercase', departure.cancelled ? 'text-muted line-through' : 'text-ink')}>
                    {formatRelativeDay(departure.date, today)}
                  </p>
                  <p className="text-small text-muted tabular-nums">{departure.startTime}</p>
                  {departure.cancelled ? (
                    <div className="mt-2.5">
                      <Tag tone="neutral">Cancelada</Tag>
                    </div>
                  ) : (
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
                  )}
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
                  {departure.cancelled ? (
                    <p className="mt-1 text-small text-muted">Sus reservas se cancelaron: el pago pendiente se anuló y el cobrado queda por reembolsar.</p>
                  ) : (
                    departure.note && <p className="mt-1 text-small text-muted">{departure.note}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
