import { TicketCheck } from 'lucide-react'
import { useState } from 'react'
import { Button, EmptyState, ErrorState, SegmentedControl, SkeletonRows, Table, Tag, Td, Th, Tr } from '@/components/ui'
import { useRedemptions } from '@/data/hooks/use-coupons'
import type { Coupon, RedemptionStatus } from '@/data/models'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useValidateCoupon } from '../validate-coupon-context'

const STATUS: Record<RedemptionStatus, { label: string; tone: 'planned' | 'confirmed' | 'neutral' }> = {
  pending: { label: 'Por validar', tone: 'planned' },
  validated: { label: 'Validado', tone: 'confirmed' },
  expired: { label: 'Vencido', tone: 'neutral' },
}

type Filter = 'all' | RedemptionStatus

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Por validar' },
  { value: 'validated', label: 'Validados' },
  { value: 'expired', label: 'Vencidos' },
] as const

interface RedemptionsTableProps {
  organizationId: string | undefined
  coupons: readonly Coupon[]
  canValidate: boolean
}

export function RedemptionsTable({ organizationId, coupons, canValidate }: RedemptionsTableProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const redemptions = useRedemptions({ organizationId, status: filter === 'all' ? undefined : filter })
  const validateCoupon = useValidateCoupon()
  const titleOf = (couponId: string) => coupons.find((coupon) => coupon.id === couponId)?.title ?? couponId

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl label="Filtrar canjes" value={filter} options={FILTERS} onChange={setFilter} size="sm" className="self-start" />
      {redemptions.isPending ? (
        <SkeletonRows rows={6} />
      ) : redemptions.isError ? (
        <ErrorState error={redemptions.error} onRetry={() => void redemptions.refetch()} />
      ) : redemptions.data.length === 0 ? (
        <EmptyState icon={<TicketCheck size={20} />} title="No hay canjes con este filtro">
          Cuando un turista pague un cupón con sus insignias, su código aparece aquí.
        </EmptyState>
      ) : (
        <Table id="canjes" caption="Canjes de cupones">
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Cupón</Th>
              <Th>Turista</Th>
              <Th>Lo canjeó</Th>
              <Th>Estado</Th>
              <Th align="right">Tarifa K'Plan</Th>
              {canValidate && <Th className="w-0" />}
            </tr>
          </thead>
          <tbody>
            {redemptions.data.slice(0, 80).map((redemption) => (
              <Tr key={redemption.id}>
                <Td className="font-mono text-small font-semibold whitespace-nowrap">{redemption.code}</Td>
                <Td className="max-w-[16rem] truncate">{titleOf(redemption.couponId)}</Td>
                <Td className="whitespace-nowrap">{redemption.touristName}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(redemption.claimedAt)}</Td>
                <Td>
                  <Tag tone={STATUS[redemption.status].tone}>{STATUS[redemption.status].label}</Tag>
                  {redemption.validatedAt && (
                    <span className="ml-2 text-caption whitespace-nowrap text-muted">{formatDateTime(redemption.validatedAt)}</span>
                  )}
                </Td>
                <Td align="right">{redemption.fee > 0 ? formatMoney(redemption.fee) : '—'}</Td>
                {canValidate && (
                  <Td className="py-2">
                    {redemption.status === 'pending' && (
                      <Button size="sm" variant="secondary" onClick={() => validateCoupon.open(redemption.code)}>
                        Validar
                      </Button>
                    )}
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
