import { Landmark } from 'lucide-react'
import { useState } from 'react'
import { Button, EmptyState, ErrorState, PageHeader, Pager, SegmentedControl, SkeletonRows, Table, Tag, Td, Th, Tr, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { usePayWithdrawal, useRejectWithdrawal, useWithdrawals } from '@/data/hooks/use-billing'
import { ACCOUNT_TYPE_LABELS, WITHDRAWAL_STATUS_LABELS, type GuideWithdrawal, type WithdrawalStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime, formatMoney } from '@/lib/format'
import { ReferenceDialog } from './components/ReferenceDialog'

const TONES: Record<WithdrawalStatus, TagTone> = { pending: 'planned', paid: 'confirmed', rejected: 'neutral' }

type Filter = 'all' | WithdrawalStatus

const FILTERS = [
  { value: 'pending', label: 'Por pagar' },
  { value: 'paid', label: 'Pagados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'all', label: 'Todos' },
] as const

/**
 * Los retiros que piden los guías de su saldo (`guide-withdrawal/`). El equipo deposita a mano y lo
 * marca pagado; si no se pudo, lo rechaza con un motivo y el monto vuelve al saldo del guía. El número
 * de cuenta completo sólo lo ve quien tiene `billing.manage`.
 */
export function WithdrawalsPage() {
  useDocumentTitle('Retiros de guías')
  const { can } = useSession()
  const manages = can('billing.manage')
  const [filter, setFilter] = useState<Filter>('pending')
  const [page, setPage] = useState(1)
  const [acting, setActing] = useState<{ withdrawal: GuideWithdrawal; action: 'pay' | 'reject' } | null>(null)
  const withdrawals = useWithdrawals({ status: filter === 'all' ? undefined : filter, page, pageSize: 25 })
  const pay = usePayWithdrawal()
  const reject = useRejectWithdrawal()
  const toast = useToast()

  const run = (value: string) => {
    if (!acting) return
    const done = {
      onSuccess: () => {
        toast({ title: acting.action === 'pay' ? 'Retiro pagado' : 'Retiro rechazado', description: 'Le avisamos al guía.' })
        setActing(null)
      },
      onError: (error: unknown) => toast({ title: errorMessage(error), tone: 'error' }),
    }
    if (acting.action === 'pay') pay.mutate({ id: acting.withdrawal.id, reference: value }, done)
    else reject.mutate({ id: acting.withdrawal.id, note: value }, done)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Retiros de guías"
        description="Lo que los guías piden retirar de su saldo a su cuenta. Se deposita a mano y se marca pagado; si no se puede pagar, se rechaza con un motivo y el monto vuelve a su saldo."
      />
      <SegmentedControl
        label="Filtrar retiros"
        value={filter}
        options={FILTERS}
        onChange={(value) => {
          setFilter(value)
          setPage(1)
        }}
        size="sm"
        className="self-start"
      />
      {!manages && <p className="text-small text-muted">Tu rol ve los retiros; el número de cuenta completo y pagarlos son de quien administra la facturación.</p>}

      {withdrawals.isPending ? (
        <SkeletonRows rows={5} />
      ) : withdrawals.isError ? (
        <ErrorState error={withdrawals.error} onRetry={() => void withdrawals.refetch()} />
      ) : withdrawals.data.results.length === 0 ? (
        <EmptyState icon={<Landmark size={20} />} title="No hay retiros con este filtro">
          {filter === 'pending' && 'Cuando un guía pida retirar su saldo desde la app, aparece aquí por orden de llegada.'}
        </EmptyState>
      ) : (
        <>
          <Table id="retiros" caption="Retiros de guías">
            <thead>
              <tr>
                <Th>Guía</Th>
                <Th>Cuenta</Th>
                <Th>Pedido</Th>
                <Th>Estado</Th>
                <Th align="right">Monto</Th>
                {manages && <Th className="w-0" />}
              </tr>
            </thead>
            <tbody>
              {withdrawals.data.results.map((withdrawal) => (
                <Tr key={withdrawal.id}>
                  <Td className="whitespace-nowrap">{withdrawal.guideName}</Td>
                  <Td>
                    <p className="text-ink">
                      {withdrawal.bankAccount.bank} · {ACCOUNT_TYPE_LABELS[withdrawal.bankAccount.accountType]}
                    </p>
                    <p className="font-mono text-caption text-muted">{withdrawal.accountNumber ?? `•••• ${withdrawal.bankAccount.last4}`}</p>
                    <p className="text-caption text-muted">A nombre de {withdrawal.bankAccount.holder}</p>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(withdrawal.requestedAt)}</Td>
                  <Td>
                    <Tag tone={TONES[withdrawal.status]}>{WITHDRAWAL_STATUS_LABELS[withdrawal.status]}</Tag>
                    {withdrawal.resolvedAt && <span className="ml-2 text-caption whitespace-nowrap text-muted">{formatDateTime(withdrawal.resolvedAt)}</span>}
                    {withdrawal.reference && <p className="mt-1 font-mono text-caption text-muted">{withdrawal.reference}</p>}
                    {withdrawal.note && <p className="mt-1 text-caption text-muted">{withdrawal.note}</p>}
                  </Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {formatMoney(withdrawal.amount)}
                  </Td>
                  {manages && (
                    <Td className="py-2 whitespace-nowrap">
                      {withdrawal.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setActing({ withdrawal, action: 'pay' })}>
                            Pagar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setActing({ withdrawal, action: 'reject' })}>
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pager page={withdrawals.data} onChange={setPage} noun={{ one: 'retiro', many: 'retiros' }} />
        </>
      )}

      <ReferenceDialog
        key={acting ? `${acting.withdrawal.id}-${acting.action}` : 'cerrado'}
        open={acting !== null}
        field={acting?.action === 'reject' ? 'note' : 'reference'}
        tone={acting?.action === 'reject' ? 'danger' : 'primary'}
        title={acting?.action === 'reject' ? 'Rechazar el retiro' : 'Pagar el retiro'}
        confirmLabel={acting?.action === 'reject' ? 'Rechazar' : 'Ya lo deposité'}
        loading={pay.isPending || reject.isPending}
        onConfirm={run}
        onClose={() => setActing(null)}
      >
        {acting && (
          <p>
            {acting.action === 'pay'
              ? `Depositaste ${formatMoney(acting.withdrawal.amount)} a ${acting.withdrawal.guideName} en ${acting.withdrawal.bankAccount.bank} (${acting.withdrawal.accountNumber ?? `•••• ${acting.withdrawal.bankAccount.last4}`}).`
              : `${formatMoney(acting.withdrawal.amount)} vuelven al saldo de ${acting.withdrawal.guideName}.`}
          </p>
        )}
      </ReferenceDialog>
    </div>
  )
}
