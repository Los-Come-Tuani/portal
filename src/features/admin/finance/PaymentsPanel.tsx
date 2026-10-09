import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, EmptyState, ErrorState, Pager, SegmentedControl, SkeletonRows, Table, Tag, Td, Th, Tr, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useConfirmPayment, usePayments, useRefundPayment } from '@/data/hooks/use-billing'
import { PAYMENT_STATUS_LABELS, type BookingPayment, type PaymentStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { formatDateTime, formatMoney } from '@/lib/format'
import { ReferenceDialog } from './components/ReferenceDialog'

const TONES: Record<PaymentStatus, TagTone> = { pending: 'planned', confirmed: 'confirmed', refund_due: 'danger', refunded: 'neutral', void: 'neutral' }

type Filter = 'all' | PaymentStatus

const FILTERS = [
  { value: 'pending', label: 'Por confirmar' },
  { value: 'refund_due', label: 'Por reembolsar' },
  { value: 'confirmed', label: 'Pagados' },
  { value: 'refunded', label: 'Reembolsados' },
  { value: 'void', label: 'Anulados' },
  { value: 'all', label: 'Todos' },
] as const

/**
 * Los cobros de las reservas (`payment/`). Con la pasarela manual, el turista paga según las
 * instrucciones y el equipo con `billing.manage` confirma cuando lo comprueba; si la reserva se
 * cancela después de pagar, lo devuelve y lo marca reembolsado.
 */
export function PaymentsPanel() {
  const { can } = useSession()
  const manages = can('billing.manage')
  const [filter, setFilter] = useState<Filter>('pending')
  const [page, setPage] = useState(1)
  const [acting, setActing] = useState<{ payment: BookingPayment; action: 'confirm' | 'refund' } | null>(null)
  const payments = usePayments({ status: filter === 'all' ? undefined : filter, page, pageSize: 25 })
  const confirm = useConfirmPayment()
  const refund = useRefundPayment()
  const toast = useToast()

  const run = (reference: string) => {
    if (!acting) return
    const mutation = acting.action === 'confirm' ? confirm : refund
    mutation.mutate(
      { id: acting.payment.id, reference },
      {
        onSuccess: () => {
          toast({ title: acting.action === 'confirm' ? 'Pago confirmado' : 'Reembolso registrado', description: 'Le avisamos al turista.' })
          setActing(null)
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Filtrar pagos"
        value={filter}
        options={FILTERS}
        onChange={(value) => {
          setFilter(value)
          setPage(1)
        }}
        size="sm"
        className="self-start"
      />
      {payments.isPending ? (
        <SkeletonRows rows={5} />
      ) : payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />
      ) : payments.data.results.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={20} />}
          title={filter === 'all' ? 'Todavía no hay pagos de reservas' : 'No hay pagos con este filtro'}
          action={
            filter !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter('all')
                  setPage(1)
                }}
              >
                Ver todos
              </Button>
            ) : (
              <ButtonLink to={paths.withdrawals}>Ver retiros de guías</ButtonLink>
            )
          }
        >
          {filter === 'pending' && 'Cuando un turista reserve una salida con costo, su pago aparece aquí hasta que lo confirmes.'}
        </EmptyState>
      ) : (
        <>
          <Table id="pagos" caption="Pagos de reservas">
            <thead>
              <tr>
                <Th>Turista</Th>
                <Th>Guía</Th>
                <Th>Desde</Th>
                <Th>Estado</Th>
                <Th>Operación</Th>
                <Th align="right">Monto</Th>
                {manages && <Th className="w-0" />}
              </tr>
            </thead>
            <tbody>
              {payments.data.results.map((payment) => (
                <Tr key={payment.id}>
                  <Td className="whitespace-nowrap">{payment.touristName}</Td>
                  <Td className="whitespace-nowrap">{payment.guideName}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(payment.createdAt)}</Td>
                  <Td>
                    <Tag tone={TONES[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Tag>
                    {(payment.refundedAt ?? payment.confirmedAt) && (
                      <span className="ml-2 text-caption whitespace-nowrap text-muted">{formatDateTime((payment.refundedAt ?? payment.confirmedAt) as string)}</span>
                    )}
                  </Td>
                  <Td className="font-mono text-small text-muted">{payment.reference || '—'}</Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {formatMoney(payment.amount)}
                  </Td>
                  {manages && (
                    <Td className="py-2 whitespace-nowrap">
                      {payment.status === 'pending' && (
                        <Button size="sm" variant="secondary" onClick={() => setActing({ payment, action: 'confirm' })}>
                          Confirmar pago
                        </Button>
                      )}
                      {payment.status === 'refund_due' && (
                        <Button size="sm" variant="secondary" onClick={() => setActing({ payment, action: 'refund' })}>
                          Marcar reembolsado
                        </Button>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pager page={payments.data} onChange={setPage} noun={{ one: 'pago', many: 'pagos' }} />
        </>
      )}

      <ReferenceDialog
        key={acting ? `${acting.payment.id}-${acting.action}` : 'cerrado'}
        open={acting !== null}
        field="reference"
        title={acting?.action === 'refund' ? 'Marcar el reembolso' : 'Confirmar el pago'}
        confirmLabel={acting?.action === 'refund' ? 'Ya se devolvió' : 'Confirmar pago'}
        loading={confirm.isPending || refund.isPending}
        onConfirm={run}
        onClose={() => setActing(null)}
      >
        {acting && (
          <p>
            {acting.action === 'confirm'
              ? `Comprobaste que ${acting.payment.touristName} pagó ${formatMoney(acting.payment.amount)}. La reserva queda pagada y, si el recorrido ya terminó, se cierra y el saldo pasa al guía.`
              : `Le devolviste ${formatMoney(acting.payment.amount)} a ${acting.payment.touristName} por una reserva cancelada.`}
          </p>
        )}
      </ReferenceDialog>
    </div>
  )
}
