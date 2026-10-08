import { ChevronDown, Receipt } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ErrorState, PageHeader, Pager, SkeletonRows, Tag } from '@/components/ui'
import { useStatements } from '@/data/hooks/use-billing'
import { MONTHLY_STATEMENT_STATUS_LABELS } from '@/data/models'
import { STATEMENT_TONES, statementMonth } from '@/features/admin/finance/lib/statements'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime, formatMoney } from '@/lib/format'
import { StatementView } from './components/StatementView'

/**
 * Los estados de cuenta del comercio (`billing/statement/`): cada mes, la insignia de su lugar y los
 * cupones que validó. K'Plan los cobra fuera de línea; aquí se ve qué se debe y qué ya se pagó.
 */
export function BillingPage() {
  useDocumentTitle('Pagos')
  const [page, setPage] = useState(1)
  const statements = useStatements({ page, pageSize: 12 })
  const pending = (statements.data?.results ?? []).filter((statement) => statement.status === 'pending' && statement.total > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pagos"
        description="Lo que le pagas a K'Plan, mes por mes: la insignia de tu lugar y los cupones que validaste. El equipo de K'Plan te contacta para cobrarlo."
      />

      {statements.isPending ? (
        <SkeletonRows rows={4} />
      ) : statements.isError ? (
        <ErrorState error={statements.error} onRetry={() => void statements.refetch()} />
      ) : (
        <>
          {pending.map((statement) => (
            <div key={statement.id} role="status" className="flex flex-wrap items-center justify-between gap-4 rounded-kp border border-danger/30 bg-danger/6 px-5 py-4">
              <p className="text-body font-semibold text-ink">
                {statementMonth(statement)}: {formatMoney(statement.total)} por pagar
              </p>
              <p className="text-small text-muted">Emitido el {formatDateTime(statement.issuedAt)}</p>
            </div>
          ))}

          {statements.data.results.length === 0 ? (
            <EmptyState icon={<Receipt size={20} />} title="Todavía no tienes estados de cuenta">
              Se emiten el primer día de cada mes, con la insignia de tu lugar y los cupones que validaste el mes anterior.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
              {statements.data.results.map((statement) => (
                <li key={statement.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas [&::-webkit-details-marker]:hidden">
                      <ChevronDown size={16} aria-hidden="true" className="text-muted transition-transform duration-200 group-open:rotate-180" />
                      <span className="min-w-0 flex-1 text-body font-semibold text-ink">{statementMonth(statement)}</span>
                      <span className="text-small text-muted">
                        {statement.paidAt ? `Pagado el ${formatDateTime(statement.paidAt)}` : `Emitido el ${formatDateTime(statement.issuedAt)}`}
                      </span>
                      <Tag tone={STATEMENT_TONES[statement.status]}>{MONTHLY_STATEMENT_STATUS_LABELS[statement.status]}</Tag>
                      <span className="w-28 text-right text-body font-semibold text-ink tabular-nums">{formatMoney(statement.total)}</span>
                    </summary>
                    <div className="border-t border-divider bg-canvas/40 px-5 py-5 sm:pl-14">
                      <StatementView statement={statement} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <Pager page={statements.data} onChange={setPage} noun={{ one: 'mes', many: 'meses' }} />
        </>
      )}
    </div>
  )
}
