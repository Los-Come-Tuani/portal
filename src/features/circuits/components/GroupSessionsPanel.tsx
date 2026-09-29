import { Bus, UsersRound } from 'lucide-react'
import { ErrorState, Panel, Skeleton, Tag } from '@/components/ui'
import { useGroupSessions } from '@/data/hooks/use-circuits'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { formatRelativeDay, plural } from '@/lib/format'

/** Los horarios de grupo los publican los guías desde la app; aquí sólo se ven. */
export function GroupSessionsPanel({ circuitId }: { circuitId: string }) {
  const sessions = useGroupSessions(circuitId)
  const { today } = useNow()
  const upcoming = (sessions.data ?? []).filter((session) => session.date >= today)
  const joined = upcoming.reduce((sum, session) => sum + session.joinedCount, 0)

  return (
    <Panel
      title="Horarios de grupo"
      description={
        upcoming.length > 0
          ? `${plural(upcoming.length, 'horario próximo', 'horarios próximos')} con ${plural(joined, 'persona inscrita', 'personas inscritas')}. Los publican los guías certificados desde la app.`
          : 'Los publican los guías certificados desde la app, con su cupo.'
      }
      bodyClassName="p-0"
    >
      {sessions.isPending ? (
        <Skeleton className="m-5 h-20" />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} className="py-8" />
      ) : upcoming.length === 0 ? (
        <p className="p-5 text-body text-muted">Todavía no hay horarios. Cuando un guía publique uno, aparece aquí con sus inscritos.</p>
      ) : (
        <ul className="divide-y divide-divider">
          {upcoming.map((session) => {
            const full = session.joinedCount >= session.capacity
            return (
              <li key={session.id} className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <div>
                  <p className="text-body font-semibold text-ink first-letter:uppercase">{formatRelativeDay(session.date, today)}</p>
                  <p className="text-small text-muted tabular-nums">{session.startTime}</p>
                  <div className="mt-2.5">
                    <p className={cn('flex items-center gap-1.5 text-small font-semibold tabular-nums', full ? 'text-confirmed' : 'text-ink')}>
                      <UsersRound size={14} aria-hidden="true" />
                      {full ? 'Lleno' : `${session.joinedCount} de ${session.capacity}`}
                    </p>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper"
                      role="meter"
                      aria-valuenow={session.joinedCount}
                      aria-valuemin={0}
                      aria-valuemax={session.capacity}
                      aria-label={`Inscritos: ${session.joinedCount} de ${session.capacity}`}
                    >
                      <div
                        className={cn('h-full rounded-full', full ? 'bg-confirmed' : 'bg-planned')}
                        style={{ width: `${Math.min(100, (session.joinedCount / session.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-body text-ink">
                    {session.guideName}
                    {session.transportIncluded && (
                      <Tag tone="neutral" icon={<Bus size={12} aria-hidden="true" />}>
                        Con transporte
                      </Tag>
                    )}
                  </p>
                  {session.note && <p className="mt-1 text-small text-muted">{session.note}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
