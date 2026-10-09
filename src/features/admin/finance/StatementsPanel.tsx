import { ChevronDown, Receipt } from 'lucide-react'
import { useState } from 'react'
import { Button, EmptyState, ErrorState, Pager, SegmentedControl, SkeletonRows, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { usePayStatement, useStatements } from '@/data/hooks/use-billing'
import { MONTHLY_STATEMENT_STATUS_LABELS, type MonthlyStatement, type MonthlyStatementStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { StatementView } from '@/features/billing/components/StatementView'
import { formatDateTime, formatMoney } from '@/lib/format'
import { ReferenceDialog } from './components/ReferenceDialog'
import { STATEMENT_TONES, statementMonth } from './lib/statements'

type Filter = 'all' | MonthlyStatementStatus

const FILTERS = [
  { value: 'pending', label: 'Por cobrar' },
  { value: 'paid', label: 'Cobrados' },
  { value: 'void', label: 'Anulados' },
  { value: 'all', label: 'Todos' },
] as const

/**
 * Los estados de cuenta de los comercios (`billing/statement/`): la insignia de su lugar y los cupones
 * que validaron cada mes. El equipo los cobra fuera de línea y, con `billing.manage`, los marca pagados.
 */
export function StatementsPanel() {
  const { can } = useSession()
  const manages = can('billing.manage')
  const [filter, setFilter] = useState<Filter>('pending')
  const [page, setPage] = useState(1)
  const [paying, setPaying] = useState<MonthlyStatement | null>(null)
  const statements = useStatements({ status: filter === 'all' ? undefined : filter, page, pageSize: 25 })
  const pay = usePayStatement()
  const toast = useToast()

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Filtrar estados de cuenta"
        value={filter}
        options={FILTERS}
        onChange={(value) => {
          setFilter(value)
          setPage(1)
        }}
        size="sm"
        className="self-start"
      />
      {statements.isPending ? (
        <SkeletonRows rows={5} />
      ) : statements.isError ? (
        <ErrorState error={statements.error} onRetry={() => void statements.refetch()} />
      ) : statements.data.results.length === 0 ? (
        <EmptyState icon={<Receipt size={20} />} title="No hay estados de cuenta con este filtro">
          Se emiten el primer día de cada mes, uno por comercio con algo que cobrar del mes anterior.
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
            {statements.data.results.map((statement) => (
              <li key={statement.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas [&::-webkit-details-marker]:hidden">
                    <ChevronDown size={16} aria-hidden="true" className="text-muted transition-transform duration-200 group-open:rotate-180" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-ink">{statement.businessName}</span>
                      <span className="text-small text-muted">{statementMonth(statement)}</span>
                    </span>
                    <span className="text-small text-muted">
                      {statement.paidAt ? `Cobrado el ${formatDateTime(statement.paidAt)}` : `Emitido el ${formatDateTime(statement.issuedAt)}`}
                    </span>
                    <Tag tone={STATEMENT_TONES[statement.status]}>{MONTHLY_STATEMENT_STATUS_LABELS[statement.status]}</Tag>
                    <span className="w-28 text-right text-body font-semibold text-ink tabular-nums">{formatMoney(statement.total)}</span>
                  </summary>
                  <div className="flex flex-col gap-4 border-t border-divider bg-canvas/40 px-5 py-5 sm:pl-14">
                    <StatementView statement={statement} />
                    {statement.reference && <p className="text-small text-muted">Operación: {statement.reference}</p>}
                    {manages && statement.status === 'pending' && (
                      <Button className="self-end" onClick={() => setPaying(statement)}>
                        Marcar cobrado
                      </Button>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <Pager page={statements.data} onChange={setPage} noun={{ one: 'estado de cuenta', many: 'estados de cuenta' }} />
        </>
      )}

      <ReferenceDialog
        key={paying?.id ?? 'cerrado'}
        open={paying !== null}
        field="reference"
        title={paying ? `Cobrar ${statementMonth(paying)} a ${paying.businessName}` : 'Cobrar'}
        confirmLabel="Marcar cobrado"
        loading={pay.isPending}
        onConfirm={(reference) =>
          paying &&
          pay.mutate(
            { id: paying.id, reference },
            {
              onSuccess: () => {
                toast({ title: 'Estado de cuenta cobrado' })
                setPaying(null)
              },
              onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
            },
          )
        }
        onClose={() => setPaying(null)}
      >
        {paying && <p>Cobraste {formatMoney(paying.total)} fuera de línea. El comercio lo ve como pagado en su portal.</p>}
      </ReferenceDialog>
    </div>
  )
}
