import { useState } from 'react'
import { Button, ConfirmDialog, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useLiftSanction } from '@/data/hooks/use-moderation'
import { SANCTION_KIND_LABELS, type Sanction } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { formatDateTime } from '@/lib/format'

/** Una lista de sanciones; quien tiene `users.manage` levanta las vigentes. */
export function SanctionList({ sanctions, showUser = false }: { sanctions: readonly Sanction[]; showUser?: boolean }) {
  const { can } = useSession()
  const lift = useLiftSanction()
  const toast = useToast()
  const [lifting, setLifting] = useState<Sanction | null>(null)

  return (
    <>
      <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
        {sanctions.map((sanction) => (
          <li key={sanction.id} className="flex flex-wrap items-start gap-4 px-5 py-4 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone={sanction.kind === 'warning' ? 'planned' : 'danger'}>{SANCTION_KIND_LABELS[sanction.kind]}</Tag>
                {showUser && <p className="text-body font-semibold text-ink">{sanction.userName}</p>}
                {/* Una advertencia sólo avisa: nunca queda vigente. */}
                {sanction.kind !== 'warning' &&
                  (sanction.active ? <Tag tone="ink">Vigente</Tag> : <Tag tone="neutral">{sanction.liftedAt ? 'Levantada' : 'Terminó'}</Tag>)}
              </div>
              <p className="mt-1 text-body text-ink">{sanction.reason}</p>
              <p className="mt-1 text-small text-muted">
                Desde el {formatDateTime(sanction.startsAt)}
                {sanction.endsAt ? ` hasta el ${formatDateTime(sanction.endsAt)}` : sanction.kind === 'warning' ? '' : ', sin fecha de fin'}
                {` · la puso ${sanction.createdBy}`}
                {sanction.liftedAt && ` · levantada el ${formatDateTime(sanction.liftedAt)}`}
              </p>
            </div>
            {sanction.active && can('users.manage') && (
              <Button size="sm" variant="secondary" onClick={() => setLifting(sanction)}>
                Levantar
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={lifting !== null}
        title={`¿Levantar la ${lifting ? SANCTION_KIND_LABELS[lifting.kind].toLowerCase() : 'sanción'} de ${lifting?.userName ?? ''}?`}
        confirmLabel="Levantar sanción"
        tone="primary"
        loading={lift.isPending}
        onClose={() => setLifting(null)}
        onConfirm={() =>
          lifting &&
          lift.mutate(lifting.id, {
            onSuccess: () => {
              toast({ title: 'Sanción levantada' })
              setLifting(null)
            },
            onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
          })
        }
      >
        Si es su última sanción vigente, la cuenta vuelve a estar activa y puede entrar otra vez.
      </ConfirmDialog>
    </>
  )
}
