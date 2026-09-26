import { ChevronDown, CircleCheck, Receipt } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, EmptyState, ErrorState, PageHeader, Panel, SkeletonRows, Tag, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessage } from '@/data/api/errors'
import { usePayStatement, useStatements } from '@/data/hooks/use-billing'
import { STATEMENT_STATUS_LABELS, type Statement } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { formatDate, formatDateTime, formatMoney, formatMonth } from '@/lib/format'
import { StatementView } from './components/StatementView'

const STATUS_TONES = { open: 'planned', due: 'danger', paid: 'confirmed' } as const

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function BillingPage() {
  useDocumentTitle('Pagos')
  const { organizationId } = useSession()
  const { today } = useNow()
  const dueLabel = (date: string) => `${date < today ? 'Venció' : 'Vence'} el ${formatDate(date)}`
  const statements = useStatements(organizationId)
  const pay = usePayStatement()
  const toast = useToast()
  const [paying, setPaying] = useState<Statement | null>(null)

  const list = statements.data ?? []
  const open = list.find((statement) => statement.status === 'open')
  const due = list.filter((statement) => statement.status === 'due' && statement.total > 0)
  const history = list.filter((statement) => statement.status !== 'open')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pagos"
        description="Lo que le pagas a K'Plan, mes por mes. Sólo se cobra lo que K'Plan te generó: cupones validados e insignias."
      />

      {statements.isPending ? (
        <SkeletonRows rows={4} />
      ) : statements.isError ? (
        <ErrorState error={statements.error} onRetry={() => void statements.refetch()} />
      ) : (
        <>
          {due.map((statement) => (
            <div
              key={statement.id}
              role="alert"
              className="flex flex-wrap items-center justify-between gap-4 rounded-kp border border-danger/30 bg-danger/6 px-5 py-4"
            >
              <div>
                <p className="text-body font-semibold text-ink">
                  {capitalize(formatMonth(statement.period))}: {formatMoney(statement.total)} por pagar
                </p>
                <p className={statement.dueDate < today ? 'text-small font-medium text-danger' : 'text-small text-muted'}>
                  {dueLabel(statement.dueDate)}.
                </p>
              </div>
              <Button onClick={() => setPaying(statement)}>Pagar {formatMoney(statement.total)}</Button>
            </div>
          ))}

          {open && (
            <Panel
              title={`${capitalize(formatMonth(open.period))}, hasta hoy`}
              description="El mes en curso: se cierra el último día y se paga en los primeros diez del siguiente."
              actions={<Tag tone={STATUS_TONES.open}>{STATEMENT_STATUS_LABELS.open}</Tag>}
            >
              <StatementView statement={open} />
            </Panel>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="history-title">
            <h2 id="history-title" className="text-title font-semibold text-ink">
              Meses anteriores
            </h2>
            {history.length === 0 ? (
              <EmptyState icon={<Receipt size={20} />} title="Todavía no hay meses cerrados" />
            ) : (
              <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
                {history.map((statement) => (
                  <li key={statement.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas [&::-webkit-details-marker]:hidden">
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="text-muted transition-transform duration-200 group-open:rotate-180"
                        />
                        <span className="min-w-0 flex-1 text-body font-semibold text-ink">
                          {capitalize(formatMonth(statement.period))}
                        </span>
                        <span className="text-small text-muted">
                          {statement.paidAt ? `Pagado el ${formatDateTime(statement.paidAt)}` : dueLabel(statement.dueDate)}
                        </span>
                        <Tag tone={STATUS_TONES[statement.status]}>{STATEMENT_STATUS_LABELS[statement.status]}</Tag>
                        <span className="w-28 text-right text-body font-semibold text-ink tabular-nums">
                          {formatMoney(statement.total)}
                        </span>
                      </summary>
                      <div className="border-t border-divider bg-canvas/40 px-5 py-5 sm:pl-14">
                        <StatementView statement={statement} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        title={paying ? `Pagar ${formatMonth(paying.period)}` : 'Pagar'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaying(null)}>
              Cancelar
            </Button>
            <Button
              loading={pay.isPending}
              onClick={() =>
                paying &&
                pay.mutate(paying.id, {
                  onSuccess: () => {
                    setPaying(null)
                    toast({ title: 'Pago registrado', description: 'Gracias. Ya está al día.' })
                  },
                  onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
                })
              }
            >
              Confirmar pago
            </Button>
          </>
        }
      >
        {paying && (
          <div className="flex flex-col gap-3 text-body">
            <p className="flex items-baseline justify-between">
              <span className="text-muted">Total</span>
              <span className="text-title font-bold text-ink tabular-nums">{formatMoney(paying.total)}</span>
            </p>
            {env.useMocks && (
              <p className="flex items-start gap-2 rounded-kp bg-paper p-3 text-small text-ink">
                <CircleCheck size={16} className="mt-0.5 shrink-0 text-confirmed" aria-hidden="true" />
                Modo demo: todavía no hay pasarela de pago, así que el pago sólo se registra.
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
