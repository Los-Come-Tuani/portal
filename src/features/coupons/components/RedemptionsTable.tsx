import { TicketCheck } from 'lucide-react'
import { useState } from 'react'
import { Button, EmptyState, ErrorState, SegmentedControl, SkeletonRows, Table, Tag, Td, Th, Tr } from '@/components/ui'
import { useRedemptions } from '@/data/hooks/use-coupons'
import { COUPON_CODE_STATUS_LABELS, type CouponCodeStatus } from '@/data/models'
import { formatDate, formatDateTime } from '@/lib/format'
import { formatCouponCode } from '../lib/code'
import { useValidateCoupon } from '../validate-coupon-context'

const TONES: Record<CouponCodeStatus, 'planned' | 'confirmed' | 'neutral'> = {
  valid: 'planned',
  consumed: 'confirmed',
  expired: 'neutral',
}

type Filter = 'all' | CouponCodeStatus

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'valid', label: 'Por usar' },
  { value: 'consumed', label: 'Usados' },
  { value: 'expired', label: 'Vencidos' },
] as const

const PAGE_SIZE = 25

/** Los cupones que los turistas canjearon con sus insignias: el comercio los valida en el mostrador. */
export function RedemptionsTable({ canValidate }: { canValidate: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const redemptions = useRedemptions({ status: filter === 'all' ? undefined : filter, page, pageSize: PAGE_SIZE })
  const validateCoupon = useValidateCoupon()

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Filtrar cupones entregados"
        value={filter}
        options={FILTERS}
        onChange={(value) => {
          setFilter(value)
          setPage(1)
        }}
        size="sm"
        className="self-start"
      />
      {redemptions.isPending ? (
        <SkeletonRows rows={6} />
      ) : redemptions.isError ? (
        <ErrorState error={redemptions.error} onRetry={() => void redemptions.refetch()} />
      ) : redemptions.data.results.length === 0 ? (
        <EmptyState icon={<TicketCheck size={20} />} title="No hay cupones con este filtro">
          Cuando un turista canjee sus insignias por uno de tus cupones, su código aparece aquí.
        </EmptyState>
      ) : (
        <>
          <Table id="cupones-entregados" caption="Cupones entregados">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Cupón</Th>
                <Th>Turista</Th>
                <Th>Lo canjeó</Th>
                <Th>Estado</Th>
                <Th>Vale hasta</Th>
                {canValidate && <Th className="w-0" />}
              </tr>
            </thead>
            <tbody>
              {redemptions.data.results.map((coupon) => (
                <Tr key={coupon.id}>
                  <Td className="font-mono text-small font-semibold whitespace-nowrap">{formatCouponCode(coupon.code)}</Td>
                  <Td className="max-w-[16rem] truncate">{coupon.title}</Td>
                  <Td className="whitespace-nowrap">{coupon.touristName}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(coupon.redeemedAt)}</Td>
                  <Td>
                    <Tag tone={TONES[coupon.status]}>{COUPON_CODE_STATUS_LABELS[coupon.status]}</Tag>
                    {coupon.consumedAt && <span className="ml-2 text-caption whitespace-nowrap text-muted">{formatDateTime(coupon.consumedAt)}</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(coupon.expiresAt.slice(0, 10))}</Td>
                  {canValidate && (
                    <Td className="py-2">
                      {coupon.status === 'valid' && (
                        <Button size="sm" variant="secondary" onClick={() => validateCoupon.open(coupon.code)}>
                          Validar
                        </Button>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
          {redemptions.data.pages > 1 && (
            <div className="flex items-center justify-between gap-4 text-small text-muted">
              <span>
                Página {redemptions.data.current} de {redemptions.data.pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={!redemptions.data.hasPrevious} onClick={() => setPage((value) => value - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" disabled={!redemptions.data.hasNext} onClick={() => setPage((value) => value + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
