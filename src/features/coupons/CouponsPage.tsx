import { Medal, Pause, Pencil, Play, Plus, TicketPercent } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Select,
  SkeletonRows,
  Tabs,
  Tag,
  useToast,
} from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { usePricing } from '@/data/hooks/use-billing'
import { useCoupons, useRedemptions, useSaveCoupon } from '@/data/hooks/use-coupons'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import type { Coupon } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { monthKey, todayISO } from '@/lib/dates'
import { formatDate, formatMoney, plural } from '@/lib/format'
import { CouponDrawer } from './components/CouponDrawer'
import { RedemptionsTable } from './components/RedemptionsTable'
import { couponToInput } from './lib/coupon-input'

type Section = 'cupones' | 'canjes'

export function CouponsPage() {
  useDocumentTitle('Cupones')
  const { isAdmin, organizationId } = useSession()
  const [section, setSection] = useState<Section>('cupones')
  const [owner, setOwner] = useState('')
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null)
  const scope = isAdmin ? owner || undefined : organizationId
  const coupons = useCoupons(scope)
  const places = usePlaces({ organizationId }, !isAdmin)
  const organizations = useOrganizations({ type: 'negocio' }, isAdmin)
  const pricing = usePricing()
  const monthStart = `${monthKey(todayISO())}-01`
  const monthRedemptions = useRedemptions({ organizationId: scope, from: monthStart })
  const save = useSaveCoupon()
  const toast = useToast()

  const stats = useMemo(() => {
    const byCoupon = new Map<string, number>()
    let validated = 0
    let pending = 0
    let fees = 0
    for (const redemption of monthRedemptions.data ?? []) {
      if (redemption.status === 'validated') {
        validated += 1
        fees += redemption.fee
        byCoupon.set(redemption.couponId, (byCoupon.get(redemption.couponId) ?? 0) + 1)
      }
      if (redemption.status === 'pending') pending += 1
    }
    return { byCoupon, validated, pending, fees }
  }, [monthRedemptions.data])

  const ownerName = (coupon: Coupon) =>
    coupon.organizationId ? (organizations.data?.find((item) => item.id === coupon.organizationId)?.name ?? '') : "K'Plan"

  const toggle = (coupon: Coupon) => {
    save.mutate(
      { id: coupon.id, input: { ...couponToInput(coupon), status: coupon.status === 'active' ? 'paused' : 'active' } },
      {
        onSuccess: () => toast({ title: coupon.status === 'active' ? 'Cupón pausado' : 'Cupón activo de nuevo' }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cupones"
        description={
          isAdmin
            ? "Los cupones de K'Plan y los de cada negocio. Los turistas los pagan con las insignias que ganan."
            : `Los turistas los pagan con las insignias que ganan en la app y te muestran un código. K'Plan cobra ${
                pricing.data ? formatMoney(pricing.data.couponFee) : 'una tarifa fija'
              } por cada canje que validas.`
        }
        actions={
          isAdmin ? (
            <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
              Cupón de K'Plan
            </Button>
          ) : (
            <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
              Nuevo cupón
            </Button>
          )
        }
      />

      {monthRedemptions.data && (
        <p className="max-w-[80ch] text-lead text-muted">
          {isAdmin ? 'Este mes se validaron ' : 'Este mes validaste '}
          <strong className="font-semibold text-ink">{plural(stats.validated, 'canje', 'canjes')}</strong>
          {stats.fees > 0 ? (
            <>
              {isAdmin ? ': ' : ', así que pagas '}
              <strong className="font-semibold text-ink">{formatMoney(stats.fees)}</strong>
              {isAdmin ? ' en tarifas de negocios.' : " a K'Plan."}
            </>
          ) : (
            '.'
          )}
          {!isAdmin &&
            stats.pending > 0 &&
            ` Hay ${plural(stats.pending, 'código', 'códigos')} de turistas esperando que ${stats.pending === 1 ? 'lo' : 'los'} valides.`}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Cupones y canjes"
          value={section}
          onChange={setSection}
          items={[
            { value: 'cupones', label: 'Cupones', count: coupons.data?.length },
            { value: 'canjes', label: 'Canjes' },
          ]}
          className="flex-1"
        />
        {isAdmin && (
          <Select aria-label="Dueño" value={owner} onChange={(event) => setOwner(event.target.value)} className="w-60">
            <option value="">Todos los dueños</option>
            <option value="kplan">K'Plan</option>
            {organizations.data?.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {section === 'canjes' ? (
        <RedemptionsTable organizationId={scope} coupons={coupons.data ?? []} canValidate={!isAdmin} />
      ) : coupons.isPending ? (
        <SkeletonRows rows={4} />
      ) : coupons.isError ? (
        <ErrorState error={coupons.error} onRetry={() => void coupons.refetch()} />
      ) : coupons.data.length === 0 ? (
        <EmptyState
          icon={<TicketPercent size={20} />}
          title="Todavía no tienes cupones"
          action={
            <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
              Crear el primero
            </Button>
          }
        >
          Un fresco gratis o un descuento convence a los turistas que juntan insignias. Sólo pagas cuando alguien lo usa.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
          {coupons.data.map((coupon) => {
            const used = stats.byCoupon.get(coupon.id) ?? 0
            return (
              <li key={coupon.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                <img src={coupon.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm bg-placeholder object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body font-semibold text-ink">{coupon.title}</p>
                    <Tag tone="outline">{coupon.discountLabel}</Tag>
                    {coupon.status === 'paused' && <Tag tone="neutral">Pausado</Tag>}
                  </div>
                  <p className="mt-0.5 truncate text-small text-muted">
                    {isAdmin && `${ownerName(coupon)} · `}
                    {coupon.validUntil ? `Vence el ${formatDate(coupon.validUntil)}` : 'Sin vencimiento'}
                    {coupon.maxRedemptions !== null && ` · Máximo ${coupon.maxRedemptions} canjes`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-small font-semibold text-ink tabular-nums" title="Lo que cuesta en la app">
                  <Medal size={15} className="text-badge-deep" aria-hidden="true" />
                  {plural(coupon.cost, 'insignia', 'insignias')}
                </div>
                <div className="w-28 text-right text-small text-muted tabular-nums">
                  <span className="font-semibold text-ink">{used}</span> este mes
                </div>
                <div className="flex shrink-0">
                  <IconButton label="Editar cupón" icon={<Pencil size={16} />} onClick={() => setEditing(coupon)} />
                  <IconButton
                    label={coupon.status === 'active' ? 'Pausar cupón' : 'Activar cupón'}
                    icon={coupon.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    onClick={() => toggle(coupon)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <CouponDrawer
        open={editing !== null}
        coupon={editing === 'new' ? null : editing}
        organizationId={isAdmin ? null : (organizationId ?? null)}
        places={places.data ?? []}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
